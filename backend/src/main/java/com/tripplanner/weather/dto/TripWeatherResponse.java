package com.tripplanner.weather.dto;

import java.time.Instant;
import java.util.List;

/**
 * Thời tiết mọi ngày của chuyến (theo {@code day_index}). {@code source}: ghi nguồn bắt buộc (CC BY 4.0).
 * {@code fetchedAt}: lúc lấy dữ liệu; null nếu không có ngày nào {@code FORECAST}.
 */
public record TripWeatherResponse(String source, Instant fetchedAt, List<DayWeatherResponse> days) {

    public static final String SOURCE = "Open-Meteo.com";
}
