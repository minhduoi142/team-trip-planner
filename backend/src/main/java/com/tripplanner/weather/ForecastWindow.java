package com.tripplanner.weather;

import com.tripplanner.weather.model.DailyForecast;
import com.tripplanner.weather.model.ForecastSnapshot;
import java.time.LocalDate;

/** Quyết định trạng thái thời tiết của từng ngày (docs/sdd-weather.md §4.4). Thuần, có unit test. */
public final class ForecastWindow {

    public record Decision(WeatherStatus status, LocalDate availableFrom, DailyForecast forecast) {

        static Decision of(WeatherStatus status) {
            return new Decision(status, null, null);
        }
    }

    private ForecastWindow() {
    }

    /** Ngày cuối nằm trong tầm dự báo ({@code forecastDays} ngày tính cả hôm nay). */
    public static LocalDate horizon(LocalDate today, int forecastDays) {
        return today.plusDays(forecastDays - 1L);
    }

    /** Ngày này có cần gọi API không (nằm trong [hôm nay, horizon]). */
    public static boolean needsForecast(LocalDate date, LocalDate today, int forecastDays) {
        return date != null && !date.isBefore(today) && !date.isAfter(horizon(today, forecastDays));
    }

    /**
     * @param date        ngày thật của "Ngày N"; null nếu chưa chốt / ngày thừa
     * @param hasLocation chuyến (hoặc ngày) có tọa độ
     * @param snapshot    dự báo của vị trí; null nếu không gọi được / không cần gọi
     */
    public static Decision classify(LocalDate date, boolean hasLocation, LocalDate today, int forecastDays,
                                    ForecastSnapshot snapshot) {
        if (date == null) {
            return Decision.of(WeatherStatus.NO_DATE);
        }
        if (!hasLocation) {
            return Decision.of(WeatherStatus.NO_LOCATION);
        }
        if (date.isBefore(today)) {
            return Decision.of(WeatherStatus.PAST);
        }
        DailyForecast forecast = snapshot == null ? null : snapshot.day(date);
        if (forecast != null) {
            return new Decision(WeatherStatus.FORECAST, null, forecast);
        }
        LocalDate lastDate = snapshot == null ? null : snapshot.lastDate();
        if (date.isAfter(horizon(today, forecastDays)) || (lastDate != null && date.isAfter(lastDate))) {
            return new Decision(WeatherStatus.TOO_FAR, date.minusDays(forecastDays - 1L), null);
        }
        return Decision.of(WeatherStatus.UNAVAILABLE);
    }
}
