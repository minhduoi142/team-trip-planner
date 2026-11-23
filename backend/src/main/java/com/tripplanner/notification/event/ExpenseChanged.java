package com.tripplanner.notification.event;

import java.util.Map;

/**
 * Khoản chi được thêm / sửa / xoá. {@code oldShares} rỗng khi CREATED, {@code newShares} rỗng khi DELETED
 * (userId → số tiền phần chia). Tên người tra ở listener lúc commit.
 */
public record ExpenseChanged(long tripId, long expenseId, long actorId, Kind kind, String title, long amount,
                             long paidById, Map<Long, Long> oldShares, Map<Long, Long> newShares) {

    public enum Kind { CREATED, UPDATED, DELETED }

    public ExpenseChanged {
        oldShares = oldShares == null ? Map.of() : Map.copyOf(oldShares);
        newShares = newShares == null ? Map.of() : Map.copyOf(newShares);
    }
}
