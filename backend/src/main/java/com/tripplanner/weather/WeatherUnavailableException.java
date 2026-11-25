package com.tripplanner.weather;

/** Không lấy được dữ liệu thời tiết (API lỗi/timeout/tắt). Không bao giờ lọt ra ngoài thành 5xx của endpoint thời tiết. */
public class WeatherUnavailableException extends RuntimeException {

    public WeatherUnavailableException(String message) {
        super(message);
    }

    public WeatherUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
