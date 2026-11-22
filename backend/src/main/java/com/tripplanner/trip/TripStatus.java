package com.tripplanner.trip;

import java.time.LocalDate;

/** Trạng thái được TÍNH từ ngày chính thức, không lưu trong DB. */
public enum TripStatus {
    PLANNING,
    UPCOMING,
    ONGOING,
    COMPLETED;

    public static TripStatus of(LocalDate startDate, LocalDate endDate, LocalDate today) {
        if (startDate == null || endDate == null) {
            return PLANNING;
        }
        if (today.isBefore(startDate)) {
            return UPCOMING;
        }
        if (!today.isAfter(endDate)) {
            return ONGOING;
        }
        return COMPLETED;
    }
}
