package com.tripplanner.weather;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** Tọa độ đã kiểm tra khoảng, làm tròn 5 chữ số (khớp cột DECIMAL(…, 5)). */
public record Coordinates(BigDecimal lat, BigDecimal lon) {

    private static final BigDecimal LAT_MAX = BigDecimal.valueOf(90);
    private static final BigDecimal LON_MAX = BigDecimal.valueOf(180);
    /** Độ chính xác khóa cache (~1,1 km): các chuyến cùng khu vực dùng chung 1 bản dự báo. */
    private static final int CACHE_SCALE = 2;

    public Coordinates {
        if (lat == null || lon == null || lat.abs().compareTo(LAT_MAX) > 0 || lon.abs().compareTo(LON_MAX) > 0) {
            throw new BusinessException(ErrorCode.INVALID_LOCATION);
        }
        lat = lat.setScale(5, RoundingMode.HALF_UP);
        lon = lon.setScale(5, RoundingMode.HALF_UP);
    }

    /** Cả hai null → null (không có vị trí); chỉ một trong hai hoặc ngoài khoảng → {@code INVALID_LOCATION}. */
    public static Coordinates ofNullable(BigDecimal lat, BigDecimal lon) {
        if (lat == null && lon == null) {
            return null;
        }
        return new Coordinates(lat, lon);
    }

    /** Tọa độ làm tròn dùng để gọi API và làm khóa cache. */
    public Coordinates rounded() {
        return new Coordinates(lat.setScale(CACHE_SCALE, RoundingMode.HALF_UP), lon.setScale(CACHE_SCALE, RoundingMode.HALF_UP));
    }

    public String cacheKey() {
        return lat.setScale(CACHE_SCALE, RoundingMode.HALF_UP).toPlainString() + ","
                + lon.setScale(CACHE_SCALE, RoundingMode.HALF_UP).toPlainString();
    }
}
