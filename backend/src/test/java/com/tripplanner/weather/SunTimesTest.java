package com.tripplanner.weather;

import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.weather.SunTimes.Sun;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

/** Số liệu đối chiếu: sunrise/sunset của Open-Meteo (timezone=auto) lấy ngày 29/11/2026. */
class SunTimesTest {

    private static final LocalDate DAY = LocalDate.of(2026, 11, 29);

    private static Sun sun(LocalDate date, double lat, double lon, String zone) {
        return SunTimes.of(date, lat, lon, ZoneId.of(zone)).orElseThrow();
    }

    private static void near(LocalTime actual, String expected, int toleranceMinutes) {
        long diff = Math.abs(Duration.between(LocalTime.parse(expected), actual).toMinutes());
        assertThat(diff).as("%s ≈ %s", actual, expected).isLessThanOrEqualTo(toleranceMinutes);
    }

    @Test
    void matchesOpenMeteoForDaLatHanoiTokyo() {
        Sun daLat = sun(DAY, 11.94, 108.44, "Asia/Ho_Chi_Minh");
        near(daLat.sunrise(), "05:49", 2);
        near(daLat.sunset(), "17:18", 2);

        Sun hanoi = sun(DAY, 21.03, 105.85, "Asia/Bangkok");
        near(hanoi.sunrise(), "06:15", 2);
        near(hanoi.sunset(), "17:14", 2);

        Sun tokyo = sun(DAY, 35.68, 139.69, "Asia/Tokyo");
        near(tokyo.sunrise(), "06:30", 2);
        near(tokyo.sunset(), "16:28", 2);
    }

    @Test
    void goldenHoursWrapSunriseAndSunsetInOrder() {
        Sun s = sun(DAY, 11.94, 108.44, "Asia/Ho_Chi_Minh");
        assertThat(s.morningGoldenStart()).isBefore(s.sunrise());
        assertThat(s.sunrise()).isBefore(s.morningGoldenEnd());
        assertThat(s.morningGoldenEnd()).isBefore(s.eveningGoldenStart());
        assertThat(s.eveningGoldenStart()).isBefore(s.sunset());
        assertThat(s.sunset()).isBefore(s.eveningGoldenEnd());
        // Gần xích đạo: từ −4° tới +6° mất chừng 40–50 phút
        assertThat(Duration.between(s.morningGoldenStart(), s.morningGoldenEnd()).toMinutes()).isBetween(35L, 55L);
        assertThat(Duration.between(s.eveningGoldenStart(), s.eveningGoldenEnd()).toMinutes()).isBetween(35L, 55L);
    }

    @Test
    void summerTimeInEuropeUsesLocalClock() {
        Sun paris = sun(LocalDate.of(2026, 6, 21), 48.8566, 2.3522, "Europe/Paris");
        near(paris.sunrise(), "05:47", 3);
        near(paris.sunset(), "21:58", 3);
    }

    @Test
    void polarNightAndMidnightSunHaveNoSunTimes() {
        ZoneId oslo = ZoneId.of("Europe/Oslo");
        assertThat(SunTimes.of(LocalDate.of(2026, 12, 21), 69.65, 18.96, oslo)).isEmpty();
        assertThat(SunTimes.of(LocalDate.of(2026, 6, 21), 69.65, 18.96, oslo)).isEmpty();
    }

    @Test
    void lowWinterSunMakesTheWholeDayGolden() {
        // Tromsø đầu tháng 2: mặt trời mọc nhưng không lên tới +6° → giờ vàng tách ở giữa trưa
        Sun s = sun(LocalDate.of(2026, 2, 5), 69.65, 18.96, "Europe/Oslo");
        assertThat(s.morningGoldenEnd()).isEqualTo(s.eveningGoldenStart());
        assertThat(s.sunrise()).isBefore(s.morningGoldenEnd());
    }

    @Test
    void farFromGreenwichStaysOnTheRequestedLocalDate() {
        // Auckland UTC+13: mọc lúc ~6h sáng địa phương = chiều hôm trước theo UTC
        Sun auckland = sun(LocalDate.of(2026, 12, 1), -36.85, 174.76, "Pacific/Auckland");
        assertThat(auckland.sunrise()).isBetween(LocalTime.of(5, 30), LocalTime.of(6, 30));
        assertThat(auckland.sunset()).isBetween(LocalTime.of(20, 0), LocalTime.of(21, 0));
    }
}
