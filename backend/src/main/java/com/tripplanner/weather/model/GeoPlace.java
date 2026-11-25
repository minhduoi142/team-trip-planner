package com.tripplanner.weather.model;

import java.math.BigDecimal;

/**
 * 1 kết quả tìm địa điểm (chữ đã chuẩn hóa Ð → Đ). {@code area}: xã/huyện/quận chứa địa điểm,
 * {@code region}: tỉnh/bang, {@code kind}: loại địa điểm tiếng Việt ("Làng/bản", "Thác nước"…). Có thể null.
 */
public record GeoPlace(String name, String area, String region, String country, String countryCode, String kind,
                       BigDecimal lat, BigDecimal lon) {
}
