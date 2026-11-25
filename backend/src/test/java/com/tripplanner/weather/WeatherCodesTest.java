package com.tripplanner.weather;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;

class WeatherCodesTest {

    @Test
    void everyDocumentedCodeMapsToItsCondition() {
        Map<Condition, int[]> table = Map.of(
                Condition.CLEAR, new int[] {0},
                Condition.PARTLY_CLOUDY, new int[] {1, 2},
                Condition.CLOUDY, new int[] {3},
                Condition.FOG, new int[] {45, 48},
                Condition.DRIZZLE, new int[] {51, 53, 55, 56, 57},
                Condition.RAIN, new int[] {61, 63, 80, 81},
                Condition.HEAVY_RAIN, new int[] {65, 66, 67, 82},
                Condition.SNOW, new int[] {71, 73, 75, 77, 85, 86},
                Condition.THUNDERSTORM, new int[] {95, 96, 99});
        table.forEach((condition, codes) -> {
            for (int code : codes) {
                assertThat(WeatherCodes.condition(code)).as("mã %d", code).isEqualTo(condition);
                assertThat(WeatherCodes.label(code)).as("nhãn mã %d", code).isNotEqualTo("Không rõ");
            }
        });
    }

    @Test
    void unknownOrMissingCodeIsUnknown() {
        assertThat(WeatherCodes.condition(null)).isEqualTo(Condition.UNKNOWN);
        assertThat(WeatherCodes.condition(42)).isEqualTo(Condition.UNKNOWN);
        assertThat(WeatherCodes.label(null)).isEqualTo("Không rõ");
        assertThat(WeatherCodes.label(42)).isEqualTo("Không rõ");
    }

    @Test
    void labelsAreVietnamese() {
        assertThat(WeatherCodes.label(80)).isEqualTo("Mưa rào nhẹ");
        assertThat(WeatherCodes.label(95)).isEqualTo("Dông");
        assertThat(Condition.THUNDERSTORM.emoji()).isEqualTo("⛈️");
    }
}
