package com.tripplanner.auth.refresh;

import java.time.Duration;
import java.time.Instant;

/**
 * Quyết định khi một refresh token được trình ra (class thuần, unit test riêng). Thứ tự kiểm tra:
 * họ đã thu hồi / quá hạn tuyệt đối → INVALID; token đã dùng → STALE (trong grace) hoặc REUSED;
 * token hết hạn → INVALID; còn lại → ROTATE.
 */
public final class RefreshTokenPolicy {

    public enum Decision {
        /** Hợp lệ: đánh dấu đã dùng, phát token mới cùng họ */
        ROTATE,
        /** Không dùng được (hết hạn / họ đã thu hồi / quá hạn tuyệt đối) */
        INVALID,
        /** Vừa được xoay trong grace window (thường do 2 tab cùng làm mới): từ chối nhưng KHÔNG thu hồi */
        STALE,
        /** Token đã dùng bị dùng lại ngoài grace window: thu hồi cả họ */
        REUSED
    }

    /** Trạng thái cần để quyết định (đọc từ token + họ của nó). */
    public record TokenState(Instant expiresAt, Instant consumedAt, Instant familyCreatedAt, boolean familyRevoked) {
    }

    private final Duration familyMaxAge;
    private final Duration reuseGrace;

    public RefreshTokenPolicy(Duration familyMaxAge, Duration reuseGrace) {
        this.familyMaxAge = familyMaxAge;
        this.reuseGrace = reuseGrace;
    }

    public Decision decide(TokenState state, Instant now) {
        if (state.familyRevoked() || !now.isBefore(familyExpiresAt(state.familyCreatedAt()))) {
            return Decision.INVALID;
        }
        if (state.consumedAt() != null) {
            return now.isBefore(state.consumedAt().plus(reuseGrace)) ? Decision.STALE : Decision.REUSED;
        }
        if (!now.isBefore(state.expiresAt())) {
            return Decision.INVALID;
        }
        return Decision.ROTATE;
    }

    /** Hạn tuyệt đối của họ (suy ra, không lưu): quá hạn này phải đăng nhập lại. */
    public Instant familyExpiresAt(Instant familyCreatedAt) {
        return familyCreatedAt.plus(familyMaxAge);
    }

    /** Hạn của token mới: hạn trượt nhưng không vượt hạn tuyệt đối của họ. */
    public Instant newTokenExpiry(Instant now, Duration refreshTtl, Instant familyCreatedAt) {
        Instant sliding = now.plus(refreshTtl);
        Instant absolute = familyExpiresAt(familyCreatedAt);
        return sliding.isBefore(absolute) ? sliding : absolute;
    }
}
