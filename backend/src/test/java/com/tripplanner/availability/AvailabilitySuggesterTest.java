package com.tripplanner.availability;

import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.availability.AvailabilitySuggester.Note;
import com.tripplanner.availability.AvailabilitySuggester.Result;
import com.tripplanner.availability.AvailabilitySuggester.Window;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AvailabilitySuggesterTest {

    private static final LocalDate D0 = LocalDate.of(2027, 1, 1);

    /** Mỗi chuỗi là lịch của 1 người: A=rảnh M=có thể B=bận .=chưa khai; userId = vị trí + 1. */
    private static Result run(int length, String... rows) {
        int days = rows[0].length();
        List<LocalDate> dates = D0.datesUntil(D0.plusDays(days)).toList();
        Map<Long, Map<LocalDate, AvailabilityStatus>> statuses = new LinkedHashMap<>();
        for (int u = 0; u < rows.length; u++) {
            Map<LocalDate, AvailabilityStatus> byDate = new HashMap<>();
            for (int d = 0; d < days; d++) {
                switch (rows[u].charAt(d)) {
                    case 'A' -> byDate.put(dates.get(d), AvailabilityStatus.AVAILABLE);
                    case 'M' -> byDate.put(dates.get(d), AvailabilityStatus.MAYBE);
                    case 'B' -> byDate.put(dates.get(d), AvailabilityStatus.BUSY);
                    default -> { }
                }
            }
            statuses.put((long) u + 1, byDate);
        }
        return AvailabilitySuggester.suggest(dates, length, List.copyOf(statuses.keySet()), statuses);
    }

    @Test
    void picksWindowWhereEveryoneIsFullyAvailable() {
        Result result = run(3,
                "BBAAAB",
                "AAAAAA",
                "BAAAAB");
        Window best = result.suggestions().getFirst();
        assertThat(best.startDate()).isEqualTo(D0.plusDays(2));
        assertThat(best.endDate()).isEqualTo(D0.plusDays(4));
        assertThat(best.availableUserIds()).containsExactly(1L, 2L, 3L);
        assertThat(result.note()).isNull();
    }

    @Test
    void maybeCountsHalfAndBusyOrUnknownCountsZero() {
        // Cửa sổ 2 ngày: [0,1] = 2 rảnh trọn (4 điểm); [2,3] = 1 rảnh + 2 có thể (4 điểm) → hòa điểm, ưu tiên nhiều rảnh trọn
        Result result = run(2,
                "AAAA",
                "AAMM",
                "..MA");
        Window first = result.suggestions().getFirst();
        assertThat(first.startDate()).isEqualTo(D0);
        assertThat(first.availableUserIds()).containsExactly(1L, 2L);
        assertThat(first.unavailableUserIds()).containsExactly(3L);

        Window second = result.suggestions().get(1);
        assertThat(second.startDate()).isEqualTo(D0.plusDays(2));
        assertThat(second.availableUserIds()).containsExactly(1L);
        assertThat(second.maybeUserIds()).containsExactly(2L, 3L);
    }

    @Test
    void oneBusyDayExcludesMemberFromWholeWindow() {
        Result result = run(3, "AABA", "AAAA");
        assertThat(result.suggestions().getFirst().availableUserIds()).containsExactly(2L);
        assertThat(result.suggestions().getFirst().unavailableUserIds()).containsExactly(1L);
    }

    @Test
    void suggestionsDoNotOverlapAndAreAtMostThree() {
        Result result = run(2, "AAAAAAAAAAAA", "AAAAAAAAAAAA");
        List<Window> picks = result.suggestions();
        assertThat(picks).hasSize(3);
        for (int i = 0; i < picks.size(); i++) {
            for (int j = i + 1; j < picks.size(); j++) {
                assertThat(picks.get(i).overlaps(picks.get(j))).isFalse();
            }
        }
        // Hòa điểm → ngày sớm hơn trước
        assertThat(picks).extracting(Window::startDate)
                .containsExactly(D0, D0.plusDays(2), D0.plusDays(4));
    }

    @Test
    void tieBreakPrefersEarlierStart() {
        Result result = run(1, "BAAB");
        assertThat(result.suggestions()).extracting(Window::startDate)
                .containsExactly(D0.plusDays(1), D0.plusDays(2));
    }

    @Test
    void noResponsesNote() {
        Result result = run(3, "......", "......");
        assertThat(result.suggestions()).isEmpty();
        assertThat(result.note()).isEqualTo(Note.NO_RESPONSES);
    }

    @Test
    void rangeTooShortNote() {
        Result result = run(4, "AAA");
        assertThat(result.suggestions()).isEmpty();
        assertThat(result.note()).isEqualTo(Note.RANGE_TOO_SHORT);
    }

    @Test
    void noMatchWhenEveryoneBusy() {
        Result result = run(2, "BBBB", "BB..");
        assertThat(result.suggestions()).isEmpty();
        assertThat(result.note()).isEqualTo(Note.NO_MATCH);
    }

    @Test
    void emptyDayListAfterFilteringPastIsTooShort() {
        Result result = AvailabilitySuggester.suggest(List.of(), 3, List.of(1L),
                Map.of(1L, Map.of(D0, AvailabilityStatus.AVAILABLE)));
        assertThat(result.note()).isEqualTo(Note.RANGE_TOO_SHORT);
    }
}
