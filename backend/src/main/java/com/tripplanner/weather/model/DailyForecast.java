package com.tripplanner.weather.model;

import java.time.LocalDate;

/**
 * Dự báo 1 ngày (ngày theo giờ địa phương của điểm đến). Các trường số có thể null khi Open-Meteo chưa có dữ liệu
 * (vd khả năng mưa, UV ở các ngày xa). Đơn vị: °C, %, mm, km/h.
 */
public record DailyForecast(LocalDate date, Integer weatherCode, Double tempMin, Double tempMax,
                            Integer precipProbability, Double precipSum, Double windMax, Double uvMax) {
}
