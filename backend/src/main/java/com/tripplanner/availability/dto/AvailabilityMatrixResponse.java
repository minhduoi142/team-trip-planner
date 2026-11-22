package com.tripplanner.availability.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Toàn bộ dữ liệu cho tab Lịch rảnh. {@code rangeStart}/{@code rangeEnd} null khi trip chưa có
 * khoảng dự kiến. {@code suggestionNote}: NO_RANGE | LOCKED | NO_RESPONSES | RANGE_TOO_SHORT | NO_MATCH | null.
 */
public record AvailabilityMatrixResponse(
        LocalDate rangeStart,
        LocalDate rangeEnd,
        Integer tripLengthDays,
        int effectiveLengthDays,
        boolean locked,
        LocalDate startDate,
        LocalDate endDate,
        List<AvailabilityMemberResponse> members,
        List<AvailabilityEntryResponse> entries,
        List<DaySummaryResponse> days,
        List<SuggestionResponse> suggestions,
        String suggestionNote) {
}
