package com.tripplanner.trip.dto;

import com.tripplanner.trip.TripRole;
import com.tripplanner.trip.TripStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** {@code inviteCode} chỉ trả cho OWNER/EDITOR; VIEWER nhận null. */
public record TripDetailResponse(
        Long id,
        String title,
        String destination,
        String description,
        String coverImageUrl,
        TripStatus status,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        LocalDate startDate,
        LocalDate endDate,
        String inviteCode,
        TripRole myRole,
        int memberCount,
        Instant createdAt,
        List<TripMemberResponse> members) {
}
