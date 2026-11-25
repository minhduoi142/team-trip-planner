package com.tripplanner.weather;

/** Trạng thái thời tiết của 1 "Ngày N" (xem {@link ForecastWindow}). */
public enum WeatherStatus {
    /** Có dự báo. */
    FORECAST,
    /** Xa hơn tầm dự báo; {@code availableFrom} = ngày bắt đầu có dự báo. */
    TOO_FAR,
    /** Ngày đã qua (không hiện). */
    PAST,
    /** Chưa chốt ngày hoặc ngày thừa: không có ngày thật. */
    NO_DATE,
    /** Chuyến chưa có tọa độ điểm đến. */
    NO_LOCATION,
    /** Không lấy được dữ liệu (API lỗi, chưa có bản cũ, hoặc tính năng đang tắt). */
    UNAVAILABLE
}
