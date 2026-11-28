package com.tripplanner.weather.dto;

import com.tripplanner.weather.WeatherStatus;
import java.time.LocalDate;

/**
 * Thời tiết của 1 "Ngày N". {@code date} null khi chưa chốt / ngày thừa. {@code placeName} = tên vị trí hiệu lực
 * (null nếu chưa có tọa độ). {@code availableFrom} chỉ có khi {@code TOO_FAR}; {@code forecast} chỉ có khi
 * {@code FORECAST}. {@code sun}: giờ mọc/lặn + giờ vàng, có khi ngày có {@code date} và vị trí, bất kể {@code status}
 * (trừ {@code PAST}); null nếu không biết múi giờ hoặc vùng cực.
 */
public record DayWeatherResponse(
        Long dayId,
        int dayIndex,
        LocalDate date,
        String placeName,
        WeatherStatus status,
        LocalDate availableFrom,
        ForecastResponse forecast,
        SunResponse sun) {
}
