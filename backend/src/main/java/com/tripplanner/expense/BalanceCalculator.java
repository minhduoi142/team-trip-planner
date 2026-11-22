package com.tripplanner.expense;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Số dư + gợi ý chuyển khoản. Class thuần để unit test.
 * net(u) = đã trả − phần phải chịu + đã chuyển đi (CONFIRMED) − đã nhận (CONFIRMED). Tổng net = 0.
 * Gợi ý: tham lam "nợ nhiều nhất → được nhận nhiều nhất", hòa thì userId nhỏ trước; tối đa N−1 dòng.
 */
public final class BalanceCalculator {

    public record Transfer(Long fromUserId, Long toUserId, long amount) {
    }

    public record Result(Map<Long, Long> net, List<Transfer> suggestions) {
    }

    private BalanceCalculator() {
    }

    /**
     * @param memberIds   mọi thành viên (để ai không có giao dịch vẫn có net = 0)
     * @param paid        userId → tổng đã trả
     * @param share       userId → tổng phần phải chịu
     * @param confirmed   các lần chuyển đã xác nhận
     */
    public static Result calculate(List<Long> memberIds, Map<Long, Long> paid, Map<Long, Long> share,
                                   List<Transfer> confirmed) {
        Map<Long, Long> net = new TreeMap<>();
        memberIds.forEach(id -> net.put(id, 0L));
        paid.forEach((id, amount) -> net.merge(id, amount, Long::sum));
        share.forEach((id, amount) -> net.merge(id, -amount, Long::sum));
        for (Transfer t : confirmed) {
            net.merge(t.fromUserId(), t.amount(), Long::sum);
            net.merge(t.toUserId(), -t.amount(), Long::sum);
        }
        return new Result(new LinkedHashMap<>(net), suggest(net));
    }

    static List<Transfer> suggest(Map<Long, Long> net) {
        // Bản sao có thể sửa; TreeMap → duyệt theo userId tăng dần để kết quả ổn định
        Map<Long, Long> remaining = new TreeMap<>(net);
        Comparator<Map.Entry<Long, Long>> byAmountThenId =
                Comparator.<Map.Entry<Long, Long>>comparingLong(e -> Math.abs(e.getValue())).reversed()
                        .thenComparing(Map.Entry::getKey);
        List<Transfer> transfers = new ArrayList<>();
        while (true) {
            Map.Entry<Long, Long> debtor = remaining.entrySet().stream()
                    .filter(e -> e.getValue() < 0).min(byAmountThenId).orElse(null);
            Map.Entry<Long, Long> creditor = remaining.entrySet().stream()
                    .filter(e -> e.getValue() > 0).min(byAmountThenId).orElse(null);
            if (debtor == null || creditor == null) {
                return transfers;
            }
            long amount = Math.min(-debtor.getValue(), creditor.getValue());
            transfers.add(new Transfer(debtor.getKey(), creditor.getKey(), amount));
            remaining.put(debtor.getKey(), debtor.getValue() + amount);
            remaining.put(creditor.getKey(), creditor.getValue() - amount);
        }
    }
}
