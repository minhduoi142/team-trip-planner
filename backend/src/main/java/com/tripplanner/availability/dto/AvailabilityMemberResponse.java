package com.tripplanner.availability.dto;

/** {@code respondedDays}: số ngày trong khoảng mà thành viên đã khai. */
public record AvailabilityMemberResponse(Long userId, String displayName, String avatarUrl, int respondedDays) {
}
