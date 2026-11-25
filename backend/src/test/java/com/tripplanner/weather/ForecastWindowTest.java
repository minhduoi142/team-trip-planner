package com.tripplanner.weather;

import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.weather.ForecastWindow.Decision;
import com.tripplanner.weather.model.DailyForecast;
import com.tripplanner.weather.model.ForecastSnapshot;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class ForecastWindowTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 25);
    private static final int DAYS = 16;

    /** Dự báo 16 ngày từ hôm nay. */
    private static ForecastSnapshot snapshot(int count) {
        List<DailyForecast> days = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            days.add(new DailyForecast(TODAY.plusDays(i), 3, 16.0, 24.0, 10, 0.0, 12.0, 6.0));
        }
        return ForecastSnapshot.of(Instant.parse("2026-11-25T01:00:00Z"), days);
    }

    @Test
    void noDateComesFirst() {
        assertThat(ForecastWindow.classify(null, false, TODAY, DAYS, null).status()).isEqualTo(WeatherStatus.NO_DATE);
    }

    @Test
    void noLocationBeforeAnythingDateRelated() {
        assertThat(ForecastWindow.classify(TODAY.minusDays(3), false, TODAY, DAYS, null).status())
                .isEqualTo(WeatherStatus.NO_LOCATION);
    }

    @Test
    void pastDay() {
        assertThat(ForecastWindow.classify(TODAY.minusDays(1), true, TODAY, DAYS, snapshot(16)).status())
                .isEqualTo(WeatherStatus.PAST);
    }

    @Test
    void forecastForTodayAndLastDayOfHorizon() {
        ForecastSnapshot snapshot = snapshot(16);
        Decision first = ForecastWindow.classify(TODAY, true, TODAY, DAYS, snapshot);
        Decision last = ForecastWindow.classify(TODAY.plusDays(15), true, TODAY, DAYS, snapshot);
        assertThat(first.status()).isEqualTo(WeatherStatus.FORECAST);
        assertThat(first.forecast().date()).isEqualTo(TODAY);
        assertThat(last.status()).isEqualTo(WeatherStatus.FORECAST);
    }

    @Test
    void beyondHorizonIsTooFarWithAvailableFrom() {
        LocalDate date = TODAY.plusDays(16);
        Decision decision = ForecastWindow.classify(date, true, TODAY, DAYS, null);
        assertThat(decision.status()).isEqualTo(WeatherStatus.TOO_FAR);
        assertThat(decision.availableFrom()).isEqualTo(TODAY.plusDays(1));
        assertThat(ForecastWindow.needsForecast(date, TODAY, DAYS)).isFalse();
        assertThat(ForecastWindow.needsForecast(TODAY.plusDays(15), TODAY, DAYS)).isTrue();
    }

    @Test
    void shorterSnapshotMakesLaterDaysTooFar() {
        Decision decision = ForecastWindow.classify(TODAY.plusDays(14), true, TODAY, DAYS, snapshot(14));
        assertThat(decision.status()).isEqualTo(WeatherStatus.TOO_FAR);
    }

    @Test
    void inRangeWithoutDataIsUnavailable() {
        assertThat(ForecastWindow.classify(TODAY.plusDays(2), true, TODAY, DAYS, null).status())
                .isEqualTo(WeatherStatus.UNAVAILABLE);
    }
}
