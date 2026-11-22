package com.tripplanner.expense;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ExpenseSplitterTest {

    private static long sum(Map<Long, Long> shares) {
        return shares.values().stream().mapToLong(Long::longValue).sum();
    }

    @Test
    void evenSplit() {
        Map<Long, Long> shares = ExpenseSplitter.splitEqually(300_000, List.of(3L, 1L, 2L), 1L);
        assertThat(shares).containsExactly(Map.entry(1L, 100_000L), Map.entry(2L, 100_000L), Map.entry(3L, 100_000L));
    }

    @Test
    void remainderGoesToPayerWhenParticipating() {
        // Ví dụ SDD: 100.000đ / 3 người, Linh (1) trả → 33.334 / 33.333 / 33.333
        Map<Long, Long> shares = ExpenseSplitter.splitEqually(100_000, List.of(1L, 2L, 3L), 1L);
        assertThat(shares).containsEntry(1L, 33_334L).containsEntry(2L, 33_333L).containsEntry(3L, 33_333L);
        assertThat(sum(shares)).isEqualTo(100_000);
    }

    @Test
    void remainderSpreadOneDongWhenPayerNotParticipating() {
        Map<Long, Long> shares = ExpenseSplitter.splitEqually(100_001, List.of(5L, 2L, 3L), 9L);
        // 100001 / 3 = 33333 dư 2 → +1 cho userId 2 và 3 (nhỏ nhất)
        assertThat(shares).containsEntry(2L, 33_334L).containsEntry(3L, 33_334L).containsEntry(5L, 33_333L);
        assertThat(sum(shares)).isEqualTo(100_001);
    }

    @Test
    void singleParticipantAndDuplicates() {
        assertThat(ExpenseSplitter.splitEqually(50_000, List.of(7L), 1L)).containsExactly(Map.entry(7L, 50_000L));
        assertThat(ExpenseSplitter.splitEqually(10, List.of(1L, 1L, 2L), 1L)).containsExactly(
                Map.entry(1L, 5L), Map.entry(2L, 5L));
    }

    @Test
    void emptyParticipantsRejected() {
        assertThatThrownBy(() -> ExpenseSplitter.splitEqually(10, List.of(), 1L))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
