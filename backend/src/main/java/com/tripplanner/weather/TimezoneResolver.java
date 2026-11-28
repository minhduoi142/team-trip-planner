package com.tripplanner.weather;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.ZoneId;

/**
 * Múi giờ của một tọa độ (docs/sdd-golden-hour-outfit.md A.2). Hỏi Open-Meteo ({@code timezone=auto}) rồi nhớ
 * 30 ngày theo tọa độ làm tròn. Gọi lỗi hoặc tính năng thời tiết bị tắt: tọa độ trong khung Việt Nam dùng
 * {@code Asia/Ho_Chi_Minh}, ngoài khung trả null (ngày đó không có giờ vàng).
 */
public class TimezoneResolver {

    static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final BigDecimal VN_LAT_MIN = new BigDecimal("8.0");
    private static final BigDecimal VN_LAT_MAX = new BigDecimal("23.5");
    private static final BigDecimal VN_LON_MIN = new BigDecimal("102.0");
    private static final BigDecimal VN_LON_MAX = new BigDecimal("109.6");

    private final WeatherProvider provider;
    private final boolean enabled;
    private final WeatherCache<ZoneId> cache;

    public TimezoneResolver(WeatherProvider provider, boolean enabled, Clock clock, Duration negativeTtl,
                            int maxEntries) {
        this.provider = provider;
        this.enabled = enabled;
        this.cache = new WeatherCache<>(clock, Duration.ofDays(30), Duration.ofDays(60), negativeTtl, maxEntries);
    }

    /** null nếu không biết múi giờ. */
    public ZoneId resolve(Coordinates location) {
        if (location == null) {
            return null;
        }
        if (enabled) {
            Coordinates point = location.rounded();
            try {
                return cache.get(point.cacheKey(), () -> {
                    ZoneId zone = provider.timezone(point);
                    if (zone == null) {
                        throw new WeatherUnavailableException("không có múi giờ", null);
                    }
                    return zone;
                });
            } catch (WeatherUnavailableException e) {
                // rơi xuống dự phòng
            }
        }
        return inVietnam(location) ? VIETNAM : null;
    }

    static boolean inVietnam(Coordinates c) {
        return c.lat().compareTo(VN_LAT_MIN) >= 0 && c.lat().compareTo(VN_LAT_MAX) <= 0
                && c.lon().compareTo(VN_LON_MIN) >= 0 && c.lon().compareTo(VN_LON_MAX) <= 0;
    }

    void clear() {
        cache.clear();
    }
}
