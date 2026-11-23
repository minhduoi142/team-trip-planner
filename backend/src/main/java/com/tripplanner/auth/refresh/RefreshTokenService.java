package com.tripplanner.auth.refresh;

import com.tripplanner.auth.refresh.RefreshTokenPolicy.Decision;
import com.tripplanner.auth.refresh.RefreshTokenPolicy.TokenState;
import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.config.AppProperties;
import com.tripplanner.user.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Refresh token rotation + reuse detection + token family (docs/sdd-refresh-token.md).
 * Token gốc chỉ trả cho client (cookie HttpOnly); DB chỉ giữ SHA-256.
 */
@Slf4j
@Service
public class RefreshTokenService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;
    private static final int MAX_USER_AGENT = 255;
    private static final Duration KEEP_REVOKED = Duration.ofDays(7);

    private final RefreshTokenRepository tokenRepository;
    private final RefreshTokenFamilyRepository familyRepository;
    private final Clock clock;
    private final Duration refreshTtl;
    private final Duration familyMaxAge;
    private final RefreshTokenPolicy policy;

    public RefreshTokenService(RefreshTokenRepository tokenRepository, RefreshTokenFamilyRepository familyRepository,
                               Clock clock, AppProperties properties) {
        this.tokenRepository = tokenRepository;
        this.familyRepository = familyRepository;
        this.clock = clock;
        AppProperties.Auth auth = properties.auth();
        this.refreshTtl = Duration.ofDays(auth.refreshTtlDays());
        this.familyMaxAge = Duration.ofDays(auth.familyMaxDays());
        this.policy = new RefreshTokenPolicy(familyMaxAge, Duration.ofSeconds(auth.reuseGraceSeconds()));
    }

    /** Token gốc (để đặt vào cookie) + hạn của nó. */
    public record IssuedRefreshToken(String value, Instant expiresAt) {
    }

    public record Rotation(User user, IssuedRefreshToken token) {
    }

    /** Đăng nhập / đăng ký: mở họ mới với token đầu tiên. */
    @Transactional
    public IssuedRefreshToken startFamily(User user, String userAgent) {
        Instant now = clock.instant();
        RefreshTokenFamily family = familyRepository.save(RefreshTokenFamily.builder()
                .user(user)
                .createdAt(now)
                .lastUsedAt(now)
                .userAgent(truncate(userAgent))
                .build());
        return issue(family, now);
    }

    /**
     * Xoay token. Khóa hàng họ trước rồi mới đọc token, để 2 request cùng lúc thấy trạng thái mới nhất.
     * {@code noRollbackFor}: phát hiện dùng lại thì THU HỒI HỌ rồi mới ném lỗi, việc thu hồi phải được commit.
     */
    @Transactional(noRollbackFor = BusinessException.class)
    public Rotation rotate(String rawToken) {
        if (!StringUtils.hasText(rawToken)) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        String hash = hash(rawToken);
        Long familyId = tokenRepository.findFamilyIdByHash(hash)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));
        RefreshTokenFamily family = familyRepository.findByIdForUpdate(familyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));
        RefreshToken token = tokenRepository.findByHash(hash)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));

        Instant now = clock.instant();
        Decision decision = policy.decide(new TokenState(token.getExpiresAt(), token.getConsumedAt(),
                family.getCreatedAt(), family.isRevoked()), now);
        switch (decision) {
            case INVALID -> throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
            case STALE -> throw new BusinessException(ErrorCode.REFRESH_TOKEN_STALE);
            case REUSED -> {
                family.revoke(RevokeReason.REUSE_DETECTED, now);
                log.warn("Refresh token reuse detected: userId={}, familyId={}, tokenId={} → revoked family",
                        family.getUser().getId(), family.getId(), token.getId());
                throw new BusinessException(ErrorCode.REFRESH_TOKEN_REUSED);
            }
            case ROTATE -> {
                token.setConsumedAt(now);
                family.setLastUsedAt(now);
                return new Rotation(family.getUser(), issue(family, now));
            }
            default -> throw new IllegalStateException("Unexpected decision " + decision);
        }
    }

    /** Đăng xuất trên trình duyệt này. Idempotent: token sai / thiếu thì bỏ qua. */
    @Transactional
    public void revokeFamilyOf(String rawToken) {
        if (!StringUtils.hasText(rawToken)) {
            return;
        }
        tokenRepository.findFamilyIdByHash(hash(rawToken))
                .flatMap(familyRepository::findByIdForUpdate)
                .ifPresent(family -> family.revoke(RevokeReason.LOGOUT, clock.instant()));
    }

    /** "Đăng xuất mọi thiết bị": thu hồi mọi họ còn hiệu lực của user. */
    @Transactional
    public int revokeAll(Long userId) {
        return familyRepository.revokeAllForUser(userId, RevokeReason.LOGOUT_ALL, clock.instant());
    }

    /** Dọn họ đã thu hồi quá 7 ngày hoặc đã quá hạn tuyệt đối (token xóa theo nhờ CASCADE). */
    @Scheduled(cron = "0 30 3 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void cleanup() {
        Instant now = clock.instant();
        int deleted = familyRepository.deleteStale(now.minus(KEEP_REVOKED), now.minus(familyMaxAge));
        if (deleted > 0) {
            log.info("Đã dọn {} họ refresh token cũ", deleted);
        }
    }

    // ---------------------------------------------------------------- helpers

    private IssuedRefreshToken issue(RefreshTokenFamily family, Instant now) {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expiresAt = policy.newTokenExpiry(now, refreshTtl, family.getCreatedAt());
        tokenRepository.save(RefreshToken.builder()
                .family(family)
                .tokenHash(hash(raw))
                .issuedAt(now)
                .expiresAt(expiresAt)
                .build());
        return new IssuedRefreshToken(raw, expiresAt);
    }

    static String hash(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 không khả dụng", e);
        }
    }

    private static String truncate(String userAgent) {
        if (!StringUtils.hasText(userAgent)) {
            return null;
        }
        return userAgent.length() > MAX_USER_AGENT ? userAgent.substring(0, MAX_USER_AGENT) : userAgent;
    }
}
