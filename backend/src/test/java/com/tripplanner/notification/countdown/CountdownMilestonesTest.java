package com.tripplanner.notification.countdown;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class CountdownMilestonesTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 24);
    private static final List<Integer> DEFAULT = List.of(7, 3, 1, 0);

    @Test
    void milestonesMatchOnlyConfiguredDays() {
        assertThat(CountdownMilestones.milestoneFor(TODAY, TODAY.plusDays(7), DEFAULT)).contains(7);
        assertThat(CountdownMilestones.milestoneFor(TODAY, TODAY.plusDays(3), DEFAULT)).contains(3);
        assertThat(CountdownMilestones.milestoneFor(TODAY, TODAY.plusDays(1), DEFAULT)).contains(1);
        assertThat(CountdownMilestones.milestoneFor(TODAY, TODAY, DEFAULT)).contains(0);

        assertThat(CountdownMilestones.milestoneFor(TODAY, TODAY.plusDays(2), DEFAULT)).isEmpty();
        assertThat(CountdownMilestones.milestoneFor(TODAY, TODAY.plusDays(8), DEFAULT)).isEmpty();
        assertThat(CountdownMilestones.milestoneFor(TODAY, TODAY.minusDays(1), DEFAULT)).isEmpty();
        assertThat(CountdownMilestones.milestoneFor(TODAY, null, DEFAULT)).isEmpty();
    }

    @Test
    void customMilestoneList() {
        assertThat(CountdownMilestones.milestoneFor(TODAY, TODAY.plusDays(14), List.of(14, 2))).contains(14);
        assertThat(CountdownMilestones.milestoneFor(TODAY, TODAY.plusDays(7), List.of(14, 2))).isEmpty();
    }

    @Test
    void catchUpOnlyAfterTodaysRunTime() {
        ZoneId vn = ZoneId.of("Asia/Ho_Chi_Minh");
        String cron = "0 0 8 * * *";
        assertThat(CountdownJob.isPastTodaysRun(cron, ZonedDateTime.of(2026, 11, 24, 7, 59, 0, 0, vn))).isFalse();
        assertThat(CountdownJob.isPastTodaysRun(cron, ZonedDateTime.of(2026, 11, 24, 8, 0, 0, 0, vn))).isTrue();
        assertThat(CountdownJob.isPastTodaysRun(cron, ZonedDateTime.of(2026, 11, 24, 23, 0, 0, 0, vn))).isTrue();
        assertThat(CountdownJob.isPastTodaysRun("0 0 8 * * MON", ZonedDateTime.of(2026, 11, 24, 9, 0, 0, 0, vn)))
                .isFalse();   // 24/11/2026 là thứ Ba: hôm nay không có lượt chạy
    }
}
