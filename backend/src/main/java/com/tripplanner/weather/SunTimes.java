package com.tripplanner.weather;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/**
 * Giờ mặt trời mọc/lặn và giờ vàng (docs/sdd-golden-hour-outfit.md phần A). Pure: tính bằng công thức vị trí mặt
 * trời của NOAA ("General Solar Position Calculations"), lặp 2 lần quanh thời điểm sự kiện, sai số khoảng ±1–2 phút.
 * Không gọi API nên có cho mọi ngày, kể cả xa hơn tầm dự báo 16 ngày.
 * <p>Giờ vàng = mặt trời ở độ cao từ −4° đến +6° (định nghĩa phổ biến của dân chụp ảnh).
 */
public final class SunTimes {

    /** Thiên đỉnh lúc mọc/lặn: 90° + khúc xạ khí quyển + bán kính đĩa mặt trời. */
    static final double ZENITH_SUNRISE = 90.833;
    /** Mặt trời ở +6°. */
    static final double ZENITH_GOLDEN_HIGH = 84.0;
    /** Mặt trời ở −4°. */
    static final double ZENITH_GOLDEN_LOW = 94.0;

    private SunTimes() {
    }

    /** Mọi giờ đều là giờ địa phương theo {@code zone}, làm tròn tới phút. */
    public record Sun(LocalTime sunrise, LocalTime sunset,
                      LocalTime morningGoldenStart, LocalTime morningGoldenEnd,
                      LocalTime eveningGoldenStart, LocalTime eveningGoldenEnd) {
    }

    /** Empty nếu hôm đó mặt trời không mọc hoặc không lặn (vùng cực). */
    public static Optional<Sun> of(LocalDate date, double lat, double lon, ZoneId zone) {
        Instant sunrise = event(date, lat, lon, zone, ZENITH_SUNRISE, true);
        Instant sunset = event(date, lat, lon, zone, ZENITH_SUNRISE, false);
        if (sunrise == null || sunset == null) {
            return Optional.empty();
        }
        Instant noon = event(date, lat, lon, zone, 0, true);   // ha = 0 → giữa trưa thiên văn
        Instant highMorning = event(date, lat, lon, zone, ZENITH_GOLDEN_HIGH, true);
        Instant highEvening = event(date, lat, lon, zone, ZENITH_GOLDEN_HIGH, false);
        Instant lowMorning = event(date, lat, lon, zone, ZENITH_GOLDEN_LOW, true);
        Instant lowEvening = event(date, lat, lon, zone, ZENITH_GOLDEN_LOW, false);
        return Optional.of(new Sun(
                local(sunrise, zone),
                local(sunset, zone),
                // Đêm trắng: mặt trời không xuống tới −4° → giờ vàng bắt đầu/kết thúc theo mọc/lặn
                local(lowMorning != null ? lowMorning : sunrise, zone),
                // Mặt trời không lên tới +6° (mùa đông vùng vĩ độ cao) → cả ngày là giờ vàng, tách ở giữa trưa
                local(highMorning != null ? highMorning : noon, zone),
                local(highEvening != null ? highEvening : noon, zone),
                local(lowEvening != null ? lowEvening : sunset, zone)));
    }

    /**
     * Thời điểm mặt trời đạt thiên đỉnh {@code zenith} (độ) vào buổi sáng ({@code rising}) hoặc chiều của ngày
     * địa phương {@code date}; null nếu không đạt. {@code zenith = 0} cho giữa trưa thiên văn.
     */
    static Instant event(LocalDate date, double lat, double lon, ZoneId zone, double zenith, boolean rising) {
        // Ngày UTC có thể lệch ngày địa phương (múi giờ xa kinh tuyến): tính rồi dịch ngày UTC nếu cần
        LocalDate utcDate = date;
        for (int attempt = 0; attempt < 3; attempt++) {
            Instant result = eventOnUtcDate(utcDate, lat, lon, zenith, rising);
            if (result == null) {
                return null;
            }
            LocalDate localDate = result.atZone(zone).toLocalDate();
            if (localDate.equals(date)) {
                return result;
            }
            utcDate = utcDate.plusDays(date.isAfter(localDate) ? 1 : -1);
        }
        return null;
    }

    /** Phút tính từ 00:00 UTC của {@code utcDate}, đổi ra Instant. */
    private static Instant eventOnUtcDate(LocalDate utcDate, double lat, double lon, double zenith, boolean rising) {
        double minutes = 720;   // đoán ban đầu: giữa trưa UTC
        for (int i = 0; i < 2; i++) {
            Double next = eventMinutes(utcDate, minutes, lat, lon, zenith, rising);
            if (next == null) {
                return null;
            }
            minutes = next;
        }
        long seconds = Math.round(minutes * 60);
        return utcDate.atStartOfDay(ZoneId.of("UTC")).toInstant().plusSeconds(seconds);
    }

    private static Double eventMinutes(LocalDate utcDate, double minutesUtc, double lat, double lon, double zenith,
                                       boolean rising) {
        int daysInYear = utcDate.isLeapYear() ? 366 : 365;
        double gamma = 2 * Math.PI / daysInYear * (utcDate.getDayOfYear() - 1 + (minutesUtc / 60 - 12) / 24);
        double eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
                - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
        double decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
                - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
                - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
        double hourAngle;
        if (zenith == 0) {
            hourAngle = 0;
        } else {
            double latRad = Math.toRadians(lat);
            double cosHa = Math.cos(Math.toRadians(zenith)) / (Math.cos(latRad) * Math.cos(decl))
                    - Math.tan(latRad) * Math.tan(decl);
            if (cosHa < -1 || cosHa > 1) {
                return null;
            }
            hourAngle = Math.toDegrees(Math.acos(cosHa));
        }
        double signed = rising ? hourAngle : -hourAngle;
        return 720 - 4 * (lon + signed) - eqTime;
    }

    private static LocalTime local(Instant instant, ZoneId zone) {
        return instant.plusSeconds(30).atZone(zone).toLocalTime().truncatedTo(ChronoUnit.MINUTES);
    }
}
