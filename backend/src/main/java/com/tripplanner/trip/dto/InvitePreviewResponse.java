package com.tripplanner.trip.dto;

import com.tripplanner.trip.TripStatus;
import java.time.LocalDate;

/** Public: xem trước chuyến đi từ link mời, không lộ danh sách thành viên. */
public record InvitePreviewResponse(
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
