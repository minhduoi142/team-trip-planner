package com.tripplanner.weather.dto;

import com.tripplanner.weather.Condition;
import com.tripplanner.weather.WeatherAdvice;
import com.tripplanner.weather.WeatherCodes;
import com.tripplanner.weather.model.DailyForecast;
import java.util.List;

/**
 * Dự báo 1 ngày. Trường số null = Open-Meteo chưa có dữ liệu (FE ẩn trường đó). Đơn vị: °C, %, mm, km/h.
 * {@code advice}: tối đa 2 gợi ý (mang áo mưa, áo ấm…), rỗng nếu thời tiết bình thường.
 */
public record ForecastResponse(
        Integer weatherCode,
        Condition condition,
        String label,
        Double tempMin,
        Double tempMax,
        Integer precipProbability,
        Double precipSum,
        Double windMax,
        Double uvMax,
        List<AdviceResponse> advice) {

    public static ForecastResponse from(DailyForecast f) {
        return new ForecastResponse(f.weatherCode(), WeatherCodes.condition(f.weatherCode()),
                WeatherCodes.label(f.weatherCode()), f.tempMin(), f.tempMax(), f.precipProbability(), f.precipSum(),
                f.windMax(), f.uvMax(), WeatherAdvice.of(f).stream().map(AdviceResponse::from).toList());
    }
}
