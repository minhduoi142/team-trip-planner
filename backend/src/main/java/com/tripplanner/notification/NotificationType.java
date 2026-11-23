package com.tripplanner.notification;

/**
 * Loại sự kiện. {@link #category()} và {@link #channel()} suy ra từ type nên không lưu ở DB (BCNF).
 * {@link #windowMinutes()}: cửa sổ chờ để gộp nhiều sự kiện vào 1 email.
 */
public enum NotificationType {
    COUNTDOWN(NotificationCategory.COUNTDOWN, 0),

    MEMBER_JOINED(NotificationCategory.MEMBER, 30),
    MEMBER_LEFT(NotificationCategory.MEMBER, 30),
    MEMBER_REMOVED(NotificationCategory.MEMBER, 30),
    /** Gửi cho chính người bị mời ra: bỏ qua việc tắt thông báo theo chuyến. */
    YOU_WERE_REMOVED(NotificationCategory.MEMBER, 30),

    EXPENSE_ADDED(NotificationCategory.EXPENSE, 10),
    EXPENSE_UPDATED(NotificationCategory.EXPENSE, 10),
    EXPENSE_DELETED(NotificationCategory.EXPENSE, 10),
    SETTLEMENT_PENDING(NotificationCategory.EXPENSE, 10),
    SETTLEMENT_CONFIRMED(NotificationCategory.EXPENSE, 10),
    SETTLEMENT_REJECTED(NotificationCategory.EXPENSE, 10);

    private final NotificationCategory category;
    private final int windowMinutes;

    NotificationType(NotificationCategory category, int windowMinutes) {
        this.category = category;
        this.windowMinutes = windowMinutes;
    }

    public NotificationCategory category() {
        return category;
    }

    public NotificationChannel channel() {
        return this == COUNTDOWN ? NotificationChannel.COUNTDOWN : NotificationChannel.DIGEST;
    }

    public int windowMinutes() {
        return windowMinutes;
    }

    /** Tắt thông báo theo chuyến có áp dụng không (người đã bị mời ra không còn quyền tắt/bật). */
    public boolean respectsTripMute() {
        return this != YOU_WERE_REMOVED;
    }
}
