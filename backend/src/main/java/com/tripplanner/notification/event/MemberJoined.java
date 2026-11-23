package com.tripplanner.notification.event;

/** Có người vào nhóm lần đầu (join idempotent: đã là thành viên thì không phát). */
public record MemberJoined(long tripId, long userId) {
}
