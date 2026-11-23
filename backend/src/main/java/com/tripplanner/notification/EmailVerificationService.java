package com.tripplanner.notification;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.notification.mail.MailDeliveryException;
import com.tripplanner.notification.mail.MailGateway;
import com.tripplanner.notification.mail.NotificationMailBuilder;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Email nhận thông báo: đặt (gửi link xác minh), xác minh, gỡ. {@code users.notify_email} chỉ chứa email đã xác
 * minh; email cũ vẫn dùng tới khi email mới được xác minh. Mail xác minh gửi ĐỒNG BỘ (không qua outbox) để token gốc
 * không nằm trong DB.
 */
@Slf4j
@Service
public class EmailVerificationService {

    static final Duration TOKEN_TTL = Duration.ofHours(NotificationMailBuilder.VERIFY_HOURS);
    static final Duration COOLDOWN = Duration.ofSeconds(60);
    static final int DAILY_LIMIT = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final EmailVerificationRepository verificationRepository;
    private final MailGateway mailGateway;
    private final NotificationMailBuilder mailBuilder;
    private final TransactionTemplate tx;
    private final Clock clock;

    public EmailVerificationService(UserRepository userRepository, EmailVerificationRepository verificationRepository,
                                    MailGateway mailGateway, NotificationMailBuilder mailBuilder,
                                    TransactionTemplate tx, Clock clock) {
        this.userRepository = userRepository;
        this.verificationRepository = verificationRepository;
        this.mailGateway = mailGateway;
        this.mailBuilder = mailBuilder;
        this.tx = tx;
        this.clock = clock;
    }

    private record PendingMail(String email, String displayName, String rawToken) {
    }

    /**
     * Lưu yêu cầu (transaction riêng, commit trước) rồi mới gửi mail. Gửi lỗi → MAIL_SEND_FAILED; yêu cầu vẫn còn,
     * người dùng bấm gửi lại sau cooldown.
     */
    public void requestEmail(Long userId, String rawEmail) {
        String email = normalize(rawEmail);
        PendingMail pending = tx.execute(status -> prepare(userId, email));
        if (pending == null) {
            return;
        }
        try {
            mailGateway.send(mailBuilder.verifyEmail(pending.email(), pending.displayName(), pending.rawToken()));
        } catch (MailDeliveryException e) {
            log.warn("Không gửi được mail xác minh cho user {}: {}", userId, e.getMessage());
            throw new BusinessException(ErrorCode.MAIL_SEND_FAILED);
        }
    }

    /** @return null nếu không cần gửi mail (email đã được xác minh sẵn) */
    private PendingMail prepare(Long userId, String email) {
        User user = requireUser(userId);
        // Email Google của chính mình (Google đã xác minh) hoặc email đang dùng → xác nhận luôn
        if (email.equals(user.getEmail()) || email.equals(user.getNotifyEmail())) {
            user.setNotifyEmail(email);
            verificationRepository.deleteById(userId);
            return null;
        }
        if (!mailGateway.isConfigured()) {
            throw new BusinessException(ErrorCode.MAIL_NOT_CONFIGURED);
        }
        Instant now = clock.instant();
        LocalDate today = LocalDate.now(clock);
        Optional<EmailVerification> existing = verificationRepository.findById(userId);
        int sentToday = 0;
        if (existing.isPresent()) {
            EmailVerification previous = existing.get();
            if (now.isBefore(previous.getLastSentAt().plus(COOLDOWN))) {
                throw new BusinessException(ErrorCode.EMAIL_VERIFICATION_COOLDOWN);
            }
            sentToday = previous.getSendDate().equals(today) ? previous.getSendCount() : 0;
            if (sentToday >= DAILY_LIMIT) {
                throw new BusinessException(ErrorCode.EMAIL_VERIFICATION_LIMIT);
            }
        }
        String rawToken = newToken();
        EmailVerification verification = existing.orElseGet(() -> EmailVerification.builder().userId(userId).build());
        verification.setEmail(email);
        verification.setTokenHash(sha256(rawToken));
        verification.setExpiresAt(now.plus(TOKEN_TTL));
        verification.setLastSentAt(now);
        verification.setSendDate(today);
        verification.setSendCount(sentToday + 1);
        verificationRepository.save(verification);
        return new PendingMail(email, user.getDisplayName(), rawToken);
    }

    @Transactional
    public String verify(String rawToken) {
        EmailVerification verification = verificationRepository.findByTokenHash(sha256(rawToken.trim()))
                .filter(v -> !v.isExpired(clock.instant()))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_EMAIL_VERIFICATION));
        User user = userRepository.findById(verification.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_EMAIL_VERIFICATION));
        user.setNotifyEmail(verification.getEmail());
        verificationRepository.delete(verification);
        return verification.getEmail();
    }

    /** Gỡ email nhận thông báo và huỷ yêu cầu đang chờ. */
    @Transactional
    public void remove(Long userId) {
        requireUser(userId).setNotifyEmail(null);
        verificationRepository.deleteById(userId);
    }

    /** Yêu cầu đang chờ còn hạn (để hiển thị). */
    @Transactional(readOnly = true)
    public Optional<EmailVerification> pending(Long userId) {
        return verificationRepository.findById(userId).filter(v -> !v.isExpired(clock.instant()));
    }

    static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String sha256(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
