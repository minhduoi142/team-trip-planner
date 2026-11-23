package com.tripplanner.notification.countdown;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/** Hôm nay có phải mốc đếm ngược của chuyến không (mặc định D-7, D-3, D-1, D-0). Class thuần, có unit test. */
public final class CountdownMilestones {

    private CountdownMilestones() {
    }

    /** @return số ngày còn lại nếu nằm trong {@code days}, ngược lại rỗng (kể cả khi chuyến đã bắt đầu) */
    public static Optional<Integer> milestoneFor(LocalDate today, LocalDate startDate, List<Integer> days) {
        if (startDate == null) {
            return Optional.empty();
        }
        long daysLeft = ChronoUnit.DAYS.between(today, startDate);
        if (daysLeft < 0 || daysLeft > Integer.MAX_VALUE) {
            return Optional.empty();
        }
        int left = (int) daysLeft;
        return days.contains(left) ? Optional.of(left) : Optional.empty();
    }
}
