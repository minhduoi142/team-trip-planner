package com.tripplanner.notification;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Thử lại khi gửi lỗi: lần lỗi thứ 1→+1 phút, 2→+5 phút, 3→+15 phút, 4→+1 giờ, lần thứ 5 → bỏ (FAILED).
 * Class thuần, có unit test.
 */
public final class RetryPolicy {

    public static final int MAX_ATTEMPTS = 5;
    private static final List<Duration> BACKOFF = List.of(
            Duration.ofMinutes(1), Duration.ofMinutes(5), Duration.ofMinutes(15), Duration.ofHours(1));

    private RetryPolicy() {
    }

    /**
     * @param failedAttempts số lần đã lỗi, tính cả lần vừa lỗi (≥ 1)
     * @return thời điểm thử lại, hoặc rỗng nếu đã hết lượt (chuyển FAILED)
     */
    public static Optional<Instant> nextAttemptAt(int failedAttempts, Instant now) {
        if (failedAttempts < 1) {
            throw new IllegalArgumentException("failedAttempts phải ≥ 1");
        }
        if (failedAttempts >= MAX_ATTEMPTS) {
            return Optional.empty();
        }
        return Optional.of(now.plus(BACKOFF.get(failedAttempts - 1)));
    }
}
