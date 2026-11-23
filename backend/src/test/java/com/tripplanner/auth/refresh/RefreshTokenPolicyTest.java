package com.tripplanner.auth.refresh;

import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.auth.refresh.RefreshTokenPolicy.Decision;
import com.tripplanner.auth.refresh.RefreshTokenPolicy.TokenState;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class RefreshTokenPolicyTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private static final Instant CREATED = NOW.minus(Duration.ofDays(3));
    private final RefreshTokenPolicy policy = new RefreshTokenPolicy(Duration.ofDays(60), Duration.ofSeconds(10));

    private static TokenState state(Instant expiresAt, Instant consumedAt, Instant familyCreated, boolean revoked) {
        return new TokenState(expiresAt, consumedAt, familyCreated, revoked);
    }

    @Test
    void validUnusedTokenRotates() {
        assertThat(policy.decide(state(NOW.plusSeconds(60), null, CREATED, false), NOW)).isEqualTo(Decision.ROTATE);
    }

    @Test
    void expiredTokenIsInvalid() {
        assertThat(policy.decide(state(NOW, null, CREATED, false), NOW)).isEqualTo(Decision.INVALID);
        assertThat(policy.decide(state(NOW.minusSeconds(1), null, CREATED, false), NOW)).isEqualTo(Decision.INVALID);
    }

    @Test
    void revokedFamilyIsInvalidEvenForUnusedOrConsumedToken() {
        assertThat(policy.decide(state(NOW.plusSeconds(60), null, CREATED, true), NOW)).isEqualTo(Decision.INVALID);
        // Đã thu hồi rồi thì không "phát hiện lại" lần nữa
        assertThat(policy.decide(state(NOW.plusSeconds(60), NOW.minusSeconds(3600), CREATED, true), NOW))
                .isEqualTo(Decision.INVALID);
    }

    @Test
    void familyOlderThanMaxAgeIsInvalid() {
        Instant oldFamily = NOW.minus(Duration.ofDays(60));
        assertThat(policy.decide(state(NOW.plusSeconds(60), null, oldFamily, false), NOW)).isEqualTo(Decision.INVALID);
    }

    @Test
    void consumedWithinGraceIsStale() {
        assertThat(policy.decide(state(NOW.plusSeconds(60), NOW.minusSeconds(9), CREATED, false), NOW))
                .isEqualTo(Decision.STALE);
    }

    @Test
    void consumedAfterGraceIsReuse() {
        assertThat(policy.decide(state(NOW.plusSeconds(60), NOW.minusSeconds(10), CREATED, false), NOW))
                .isEqualTo(Decision.REUSED);
        // Token cũ đã hết hạn nhưng bị dùng lại: vẫn là dấu hiệu lộ token → REUSED
        assertThat(policy.decide(state(NOW.minusSeconds(1), NOW.minus(Duration.ofDays(20)), CREATED, false), NOW))
                .isEqualTo(Decision.REUSED);
    }

    @Test
    void newTokenExpiryNeverExceedsFamilyAbsoluteExpiry() {
        Instant oldFamily = NOW.minus(Duration.ofDays(55));
        assertThat(policy.newTokenExpiry(NOW, Duration.ofDays(14), oldFamily)).isEqualTo(oldFamily.plus(Duration.ofDays(60)));
        assertThat(policy.newTokenExpiry(NOW, Duration.ofDays(14), CREATED)).isEqualTo(NOW.plus(Duration.ofDays(14)));
    }
}
