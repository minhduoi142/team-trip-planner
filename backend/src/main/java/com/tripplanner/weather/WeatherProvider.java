package com.tripplanner.weather;

import com.tripplanner.weather.model.DailyForecast;
import com.tripplanner.weather.model.GeoPlace;
import java.time.ZoneId;
import java.util.List;

/** Nguồn dữ liệu thời tiết (Open-Meteo). Test tích hợp mock interface này để không gọi mạng. */
public interface WeatherProvider {

    /** Tìm địa điểm theo tên (tiếng Việt). Không có kết quả → danh sách rỗng. */
    List<GeoPlace> search(String query);

    /** Dự báo theo ngày cho tọa độ (đã làm tròn), ngày theo giờ địa phương của điểm đó. */
    List<DailyForecast> forecast(Coordinates point);

    /**
     * Múi giờ IANA của tọa độ (đã làm tròn), dùng cho giờ mặt trời mọc/lặn (docs/sdd-golden-hour-outfit.md A.2).
     * Lỗi → {@link WeatherUnavailableException}.
     */
    ZoneId timezone(Coordinates point);
}
