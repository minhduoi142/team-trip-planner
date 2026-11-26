package com.tripplanner.trip.dto;

import com.tripplanner.trip.TripStatus;
import java.time.LocalDate;

/**
 * Public: xem trước chuyến đi từ link mời, không lộ danh sách thành viên.
 * {@code coverSeed} chọn ảnh bìa mặc định giống hệt trang chuyến đi (FE dùng id chuyến làm seed).
 */
public record InvitePreviewResponse(
        long coverSeed,
        String title,
        String destination,
        String coverImageUrl,
        TripStatus status,
        int memberCount,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        LocalDate startDate,
        LocalDate endDate) {
}
