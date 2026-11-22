package com.tripplanner.itinerary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.tripplanner.itinerary.ItineraryCategory;
import com.tripplanner.itinerary.ItineraryItem;
import java.time.LocalTime;

public record ItineraryItemResponse(
        Long id,
        Long dayId,
        String title,
        ItineraryCategory category,
        @JsonFormat(pattern = "HH:mm") LocalTime startTime,
        @JsonFormat(pattern = "HH:mm") LocalTime endTime,
        String locationName,
        String mapsUrl,
        String note,
        Long estimatedCost,
        int sortOrder,
        String createdByName) {

    public static ItineraryItemResponse from(ItineraryItem item) {
        return new ItineraryItemResponse(
                item.getId(), item.getTripDay().getId(), item.getTitle(), item.getCategory(),
                item.getStartTime(), item.getEndTime(), item.getLocationName(), item.getMapsUrl(),
                item.getNote(), item.getEstimatedCost(), item.getSortOrder(),
                item.getCreatedBy() == null ? null : item.getCreatedBy().getDisplayName());
    }
}
