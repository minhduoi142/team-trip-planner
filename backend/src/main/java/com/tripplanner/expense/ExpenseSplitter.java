package com.tripplanner.expense;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Chia đều 1 khoản chi (VND, số nguyên). Mỗi người floor(amount/N); phần dư cộng cho NGƯỜI TRẢ nếu người trả
 * có tham gia, ngược lại cộng +1đ cho r người đầu tiên theo userId tăng dần. Class thuần để unit test.
 */
public final class ExpenseSplitter {

    private ExpenseSplitter() {
    }

    /** @return userId → số tiền, theo thứ tự userId tăng dần; tổng luôn đúng bằng {@code amount}. */
    public static Map<Long, Long> splitEqually(long amount, List<Long> participantIds, Long payerId) {
        if (participantIds.isEmpty()) {
            throw new IllegalArgumentException("Cần ít nhất 1 người tham gia");
        }
        List<Long> ids = participantIds.stream().distinct().sorted().toList();
        int n = ids.size();
        long base = amount / n;
        long remainder = amount % n;

        Map<Long, Long> shares = new LinkedHashMap<>();
        ids.forEach(id -> shares.put(id, base));
        if (remainder == 0) {
            return shares;
        }
        if (shares.containsKey(payerId)) {
            shares.merge(payerId, remainder, Long::sum);
        } else {
            for (int i = 0; i < remainder; i++) {
                shares.merge(ids.get(i), 1L, Long::sum);
            }
        }
        return shares;
    }
}
