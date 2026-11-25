package com.tripplanner.weather.dto;

import com.tripplanner.weather.Condition;
import com.tripplanner.weather.WeatherCodes;
import com.tripplanner.weather.model.DailyForecast;

/** Dự báo 1 ngày. Trường số null = Open-Meteo chưa có dữ liệu (FE ẩn trường đó). Đơn vị: °C, %, mm, km/h. */
public record ForecastResponse(
        Integer weatherCode,
        Condition condition,
        String label,
        Double tempMin,
        Double tempMax,
        Integer precipProbability,
        Double precipSum,
        Double windMax,
        Double uvMax) {

    public static ForecastResponse from(DailyForecast f) {
        return new ForecastResponse(f.weatherCode(), WeatherCodes.condition(f.weatherCode()),
                WeatherCodes.label(f.weatherCode()), f.tempMin(), f.tempMax(), f.precipProbability(), f.precipSum(),
                f.windMax(), f.uvMax());
    }
}
