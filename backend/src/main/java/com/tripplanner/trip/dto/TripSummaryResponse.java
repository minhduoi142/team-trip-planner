package com.tripplanner.trip.dto;

import com.tripplanner.trip.TripRole;
import com.tripplanner.trip.TripStatus;
import java.time.LocalDate;
import java.util.List;

/** Một thẻ trên Dashboard. {@code previewMembers} tối đa 5 người, theo thứ tự tham gia. */
public record TripSummaryResponse(
        Long id,
        String title,
        String destination,
        String coverImageUrl,
        TripStatus status,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        LocalDate startDate,
        LocalDate endDate,
        TripRole myRole,
        int memberCount,
        List<MemberPreview> previewMembers) {
}
