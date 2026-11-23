package com.tripplanner.notification.event;

/**
 * Có người rời nhóm. {@code removedById} null = tự rời, khác null = OWNER mời ra.
 * Phát SAU khi xoá thành viên, trong cùng transaction.
 */
public record MemberLeft(long tripId, long userId, Long removedById) {
}
