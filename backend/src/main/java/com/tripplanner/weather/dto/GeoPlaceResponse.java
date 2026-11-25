package com.tripplanner.weather.dto;

import com.tripplanner.weather.model.GeoPlace;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Gợi ý địa điểm. {@code area}: xã/huyện; {@code region}: tỉnh/bang; {@code kind}: loại ("Làng/bản", "Thác nước"…).
 * {@code label} = tên + xã/huyện + tỉnh + quốc gia (bỏ phần trùng tên), tối đa 150 ký tự: FE dùng làm giá trị ô
 * "Điểm đến" khi người dùng chọn.
 */
public record GeoPlaceResponse(String name, String area, String region, String country, String countryCode,
                               String kind, BigDecimal lat, BigDecimal lon, String label) {

    static final int MAX_LABEL = 150;

    public static GeoPlaceResponse from(GeoPlace place) {
        List<String> parts = new ArrayList<>();
        parts.add(place.name());
        if (place.area() != null && !place.area().equalsIgnoreCase(place.name())) {
            parts.add(place.area());
        }
        if (place.region() != null && !place.region().equalsIgnoreCase(place.name())) {
            parts.add(place.region());
        }
        if (place.country() != null) {
            parts.add(place.country());
        }
        String label = String.join(", ", parts);
        if (label.length() > MAX_LABEL) {
            label = label.substring(0, MAX_LABEL).trim();
        }
        return new GeoPlaceResponse(place.name(), place.area(), place.region(), place.country(), place.countryCode(),
                place.kind(), place.lat(), place.lon(), label);
    }
}
