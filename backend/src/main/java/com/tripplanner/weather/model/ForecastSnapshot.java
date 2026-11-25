package com.tripplanner.weather.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.NavigableMap;
import java.util.TreeMap;

/** Dự báo của 1 vị trí tại thời điểm {@code fetchedAt}, tra theo ngày. Bất biến (dùng chung giữa các request). */
public record ForecastSnapshot(Instant fetchedAt, NavigableMap<LocalDate, DailyForecast> days) {

    public ForecastSnapshot {
        days = Collections.unmodifiableNavigableMap(new TreeMap<>(days));
    }

    public static ForecastSnapshot of(Instant fetchedAt, List<DailyForecast> days) {
        NavigableMap<LocalDate, DailyForecast> byDate = new TreeMap<>();
        days.forEach(d -> byDate.put(d.date(), d));
        return new ForecastSnapshot(fetchedAt, byDate);
    }

    public DailyForecast day(LocalDate date) {
        return days.get(date);
    }

    /** Ngày cuối có dự báo; null nếu rỗng. */
    public LocalDate lastDate() {
        return days.isEmpty() ? null : days.lastKey();
    }
}
