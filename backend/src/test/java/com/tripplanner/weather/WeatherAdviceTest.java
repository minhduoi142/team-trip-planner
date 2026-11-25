package com.tripplanner.weather;

import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.checklist.ChecklistCategory;
import com.tripplanner.weather.WeatherAdvice.Advice;
import com.tripplanner.weather.WeatherAdvice.Type;
import com.tripplanner.weather.model.DailyForecast;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class WeatherAdviceTest {

    private static final LocalDate DAY = LocalDate.of(2026, 12, 5);

    /** Ngày đẹp trời mặc định; từng test chỉnh 1 trường. */
    private static DailyForecast day(Integer code, Double tMin, Double tMax, Integer rainP, Double rainSum, Double wind,
                                     Double uv) {
        return new DailyForecast(DAY, code, tMin, tMax, rainP, rainSum, wind, uv);
    }

    private static List<Type> types(DailyForecast f) {
        return WeatherAdvice.of(f).stream().map(Advice::type).toList();
    }

    @Test
    void niceDayHasNoAdvice() {
        assertThat(WeatherAdvice.of(day(1, 20.0, 28.0, 10, 0.0, 12.0, 6.0))).isEmpty();
    }

    @Test
    void rainByProbabilityOrAmountAtThresholds() {
        Advice byProbability = WeatherAdvice.of(day(61, 20.0, 28.0, 60, 0.0, 10.0, 5.0)).get(0);
        assertThat(byProbability.type()).isEqualTo(Type.RAIN);
        assertThat(byProbability.text()).isEqualTo("Khả năng mưa 60% – nhớ mang áo mưa/ô");
        assertThat(byProbability.checklistItem().itemName()).isEqualTo("Áo mưa");
        assertThat(byProbability.checklistItem().category()).isEqualTo(ChecklistCategory.OTHER);

        assertThat(types(day(61, 20.0, 28.0, 59, 4.9, 10.0, 5.0))).isEmpty();
        Advice byAmount = WeatherAdvice.of(day(61, 20.0, 28.0, null, 5.0, 10.0, 5.0)).get(0);
        assertThat(byAmount.text()).isEqualTo("Có thể mưa – nhớ mang áo mưa/ô");
    }

    @Test
    void stormReplacesRain() {
        List<Advice> advice = WeatherAdvice.of(day(95, 22.0, 30.0, 90, 20.0, 10.0, 5.0));
        assertThat(advice).extracting(Advice::type).containsExactly(Type.STORM);
        assertThat(advice.get(0).checklistItem().itemName()).isEqualTo("Áo mưa");
    }

    @Test
    void coldHotUvWindThresholds() {
        assertThat(types(day(1, 15.0, 22.0, 0, 0.0, 0.0, 0.0))).containsExactly(Type.COLD);
        assertThat(types(day(1, 15.1, 22.0, 0, 0.0, 0.0, 0.0))).isEmpty();
        assertThat(types(day(1, 26.0, 35.0, 0, 0.0, 0.0, 0.0))).containsExactly(Type.HOT);
        assertThat(types(day(1, 26.0, 34.9, 0, 0.0, 0.0, 7.9))).isEmpty();
        assertThat(types(day(1, 26.0, 30.0, 0, 0.0, 0.0, 8.0))).containsExactly(Type.UV);
        assertThat(types(day(1, 26.0, 30.0, 0, 0.0, 40.0, 0.0))).containsExactly(Type.WIND);

        Advice cold = WeatherAdvice.of(day(1, 12.4, 22.0, 0, 0.0, 0.0, 0.0)).get(0);
        assertThat(cold.text()).isEqualTo("Trời lạnh 12°C – mang áo ấm");
        assertThat(cold.checklistItem().itemName()).isEqualTo("Áo khoác ấm");
        Advice uv = WeatherAdvice.of(day(1, 26.0, 30.0, 0, 0.0, 0.0, 9.0)).get(0);
        assertThat(uv.checklistItem().category()).isEqualTo(ChecklistCategory.MEDICAL);
        assertThat(WeatherAdvice.of(day(1, 26.0, 36.0, 0, 0.0, 0.0, 0.0)).get(0).checklistItem()).isNull();
    }

    @Test
    void atMostTwoByPriority() {
        // Mưa + lạnh + UV + gió → chỉ giữ mưa, lạnh
        assertThat(types(day(63, 10.0, 18.0, 80, 9.0, 50.0, 9.0))).containsExactly(Type.RAIN, Type.COLD);
        // Nóng + UV + gió → nóng, UV
        assertThat(types(day(0, 27.0, 37.0, 0, 0.0, 45.0, 11.0))).containsExactly(Type.HOT, Type.UV);
    }

    @Test
    void missingValuesAreIgnored() {
        assertThat(WeatherAdvice.of(day(null, null, null, null, null, null, null))).isEmpty();
    }
}
