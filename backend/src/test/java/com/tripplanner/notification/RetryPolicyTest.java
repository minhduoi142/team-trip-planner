package com.tripplanner.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class RetryPolicyTest {

    private static final Instant NOW = Instant.parse("2026-11-24T01:00:00Z");

    @Test
    void backoffGrowsThenGivesUp() {
        assertThat(RetryPolicy.nextAttemptAt(1, NOW)).contains(NOW.plus(Duration.ofMinutes(1)));
        assertThat(RetryPolicy.nextAttemptAt(2, NOW)).contains(NOW.plus(Duration.ofMinutes(5)));
        assertThat(RetryPolicy.nextAttemptAt(3, NOW)).contains(NOW.plus(Duration.ofMinutes(15)));
        assertThat(RetryPolicy.nextAttemptAt(4, NOW)).contains(NOW.plus(Duration.ofHours(1)));
        assertThat(RetryPolicy.nextAttemptAt(5, NOW)).isEmpty();
        assertThat(RetryPolicy.nextAttemptAt(9, NOW)).isEmpty();
    }

    @Test
    void zeroAttemptsIsInvalid() {
        assertThatThrownBy(() -> RetryPolicy.nextAttemptAt(0, NOW)).isInstanceOf(IllegalArgumentException.class);
    }
}
