package com.tripplanner.notification;

/**
 * Loại sự kiện. {@link #category()} và {@link #channel()} suy ra từ type nên không lưu ở DB (BCNF).
 * Thời gian chờ trước khi gửi là cấu hình chung {@code app.notifications.delay-minutes} (mặc định 0 = gửi ngay).
 */
public enum NotificationType {
    COUNTDOWN(NotificationCategory.COUNTDOWN),

    MEMBER_JOINED(NotificationCategory.MEMBER),
    MEMBER_LEFT(NotificationCategory.MEMBER),
    MEMBER_REMOVED(NotificationCategory.MEMBER),
    /** Gửi cho chính người bị mời ra: bỏ qua việc tắt thông báo theo chuyến. */
    YOU_WERE_REMOVED(NotificationCategory.MEMBER),

    EXPENSE_ADDED(NotificationCategory.EXPENSE),
    EXPENSE_UPDATED(NotificationCategory.EXPENSE),
    EXPENSE_DELETED(NotificationCategory.EXPENSE),
    SETTLEMENT_PENDING(NotificationCategory.EXPENSE),
    SETTLEMENT_CONFIRMED(NotificationCategory.EXPENSE),
    SETTLEMENT_REJECTED(NotificationCategory.EXPENSE);

    private final NotificationCategory category;

    NotificationType(NotificationCategory category) {
        this.category = category;
    }

    public NotificationCategory category() {
        return category;
    }

    public NotificationChannel channel() {
        return this == COUNTDOWN ? NotificationChannel.COUNTDOWN : NotificationChannel.DIGEST;
    }

    /** Tắt thông báo theo chuyến có áp dụng không (người đã bị mời ra không còn quyền tắt/bật). */
    public boolean respectsTripMute() {
        return this != YOU_WERE_REMOVED;
    }
}
