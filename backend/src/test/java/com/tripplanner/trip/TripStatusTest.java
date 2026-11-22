package com.tripplanner.trip;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class TripStatusTest {

    private static final LocalDate START = LocalDate.of(2027, 3, 10);
    private static final LocalDate END = LocalDate.of(2027, 3, 12);

    @Test
    void planningWhenDatesNotLocked() {
        assertThat(TripStatus.of(null, null, START)).isEqualTo(TripStatus.PLANNING);
    }

    @Test
    void upcomingBeforeStart() {
        assertThat(TripStatus.of(START, END, START.minusDays(1))).isEqualTo(TripStatus.UPCOMING);
    }

    @Test
    void ongoingFromStartToEndInclusive() {
        assertThat(TripStatus.of(START, END, START)).isEqualTo(TripStatus.ONGOING);
        assertThat(TripStatus.of(START, END, START.plusDays(1))).isEqualTo(TripStatus.ONGOING);
        assertThat(TripStatus.of(START, END, END)).isEqualTo(TripStatus.ONGOING);
    }

    @Test
    void completedAfterEnd() {
        assertThat(TripStatus.of(START, END, END.plusDays(1))).isEqualTo(TripStatus.COMPLETED);
    }

    @Test
    void singleDayTrip() {
        assertThat(TripStatus.of(START, START, START)).isEqualTo(TripStatus.ONGOING);
        assertThat(TripStatus.of(START, START, START.plusDays(1))).isEqualTo(TripStatus.COMPLETED);
    }
}
