package com.tripplanner.expense;

import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.expense.BalanceCalculator.Result;
import com.tripplanner.expense.BalanceCalculator.Transfer;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class BalanceCalculatorTest {

    private static final List<Long> MEMBERS = List.of(1L, 2L, 3L, 4L);

    /** Áp các lần chuyển gợi ý lên net → mọi người phải về 0. */
    private static void assertSettlesEverything(Result result) {
        Map<Long, Long> after = new HashMap<>(result.net());
        for (Transfer t : result.suggestions()) {
            assertThat(t.amount()).isPositive();
            after.merge(t.fromUserId(), t.amount(), Long::sum);
            after.merge(t.toUserId(), -t.amount(), Long::sum);
        }
        assertThat(after.values()).allMatch(v -> v == 0);
    }

    @Test
    void netSumsToZeroAndSuggestionsSettleAll() {
        // 1 trả 400k, 2 trả 200k; mỗi người chịu 150k
        Result r = BalanceCalculator.calculate(MEMBERS,
                Map.of(1L, 400_000L, 2L, 200_000L),
                Map.of(1L, 150_000L, 2L, 150_000L, 3L, 150_000L, 4L, 150_000L),
                List.of());
        assertThat(r.net()).containsEntry(1L, 250_000L).containsEntry(2L, 50_000L)
                .containsEntry(3L, -150_000L).containsEntry(4L, -150_000L);
        assertThat(r.net().values().stream().mapToLong(Long::longValue).sum()).isZero();
        assertThat(r.suggestions()).hasSizeLessThanOrEqualTo(MEMBERS.size() - 1);
        assertSettlesEverything(r);
    }

    @Test
    void greedyPairsLargestDebtorWithLargestCreditorDeterministically() {
        Result r = BalanceCalculator.calculate(MEMBERS,
                Map.of(1L, 400_000L, 2L, 200_000L),
                Map.of(1L, 150_000L, 2L, 150_000L, 3L, 150_000L, 4L, 150_000L),
                List.of());
        // 3 và 4 cùng nợ 150k → userId nhỏ (3) trước; chủ nợ lớn nhất là 1
        assertThat(r.suggestions()).containsExactly(
                new Transfer(3L, 1L, 150_000L),
                new Transfer(4L, 1L, 100_000L),
                new Transfer(4L, 2L, 50_000L));
    }

    @Test
    void onlyConfirmedSettlementsReduceDebt() {
        Map<Long, Long> paid = Map.of(1L, 200_000L);
        Map<Long, Long> share = Map.of(1L, 100_000L, 2L, 100_000L);
        Result before = BalanceCalculator.calculate(List.of(1L, 2L), paid, share, List.of());
        assertThat(before.net()).containsEntry(2L, -100_000L);

        // 2 đã chuyển 60k cho 1 (CONFIRMED) → còn nợ 40k
        Result after = BalanceCalculator.calculate(List.of(1L, 2L), paid, share,
                List.of(new Transfer(2L, 1L, 60_000L)));
        assertThat(after.net()).containsEntry(1L, 40_000L).containsEntry(2L, -40_000L);
        assertThat(after.suggestions()).containsExactly(new Transfer(2L, 1L, 40_000L));
    }

    @Test
    void nobodyOwesAnything() {
        Result r = BalanceCalculator.calculate(MEMBERS, Map.of(), Map.of(), List.of());
        assertThat(r.net().values()).allMatch(v -> v == 0);
        assertThat(r.suggestions()).isEmpty();
    }

    @Test
    void overpaidSettlementFlipsDirection() {
        // 2 nợ 50k nhưng lỡ chuyển 80k → 1 phải trả lại 2 30k
        Result r = BalanceCalculator.calculate(List.of(1L, 2L), Map.of(1L, 100_000L),
                Map.of(1L, 50_000L, 2L, 50_000L), List.of(new Transfer(2L, 1L, 80_000L)));
        assertThat(r.suggestions()).containsExactly(new Transfer(1L, 2L, 30_000L));
    }
}
