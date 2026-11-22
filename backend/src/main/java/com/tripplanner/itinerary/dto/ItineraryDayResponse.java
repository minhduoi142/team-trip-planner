package com.tripplanner.itinerary.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * {@code date} null khi chưa chốt hoặc là ngày thừa. {@code timeOrderBroken}: có hoạt động có giờ
 * nằm ngược thứ tự (để FE hiện cảnh báo nhẹ).
 */
public record ItineraryDayResponse(
        Long id,
        int dayIndex,
        LocalDate date,
        boolean overflow,
        String note,
        DressCodeResponse dress,
        long totalCost,
        boolean timeOrderBroken,
        List<ItineraryItemResponse> items) {
}
