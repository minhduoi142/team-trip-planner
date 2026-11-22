package com.tripplanner.itinerary.dto;

import java.time.LocalDate;
import java.util.List;

/** Toàn bộ tab Lịch trình. {@code tripDays} = số ngày đã chốt (null nếu chưa chốt). */
public record ItineraryResponse(
        boolean locked,
        LocalDate startDate,
        LocalDate endDate,
        Integer tripDays,
        long totalCost,
        List<ItineraryDayResponse> days) {
}
