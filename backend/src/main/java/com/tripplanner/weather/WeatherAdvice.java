package com.tripplanner.weather;

import com.tripplanner.checklist.ChecklistCategory;
import com.tripplanner.weather.model.DailyForecast;
import java.util.ArrayList;
import java.util.List;

/**
 * Gợi ý hành động từ dự báo 1 ngày (docs/sdd-weather.md §6.2). Tối đa {@link #MAX_ADVICE} gợi ý theo độ ưu tiên
 * STORM → RAIN → COLD → HOT → UV → WIND; STORM và RAIN không cùng xuất hiện (cùng món "Áo mưa"). Thuần, có unit test.
 */
public final class WeatherAdvice {

    public enum Type { STORM, RAIN, COLD, HOT, UV, WIND }

    /** Món nên thêm vào checklist chung (FE gọi POST /trips/{id}/checklist sẵn có). */
    public record ChecklistSuggestion(String itemName, ChecklistCategory category) {
    }

    public record Advice(Type type, String text, ChecklistSuggestion checklistItem) {
    }

    static final int MAX_ADVICE = 2;
    static final int RAIN_PROBABILITY = 60;
    static final double RAIN_SUM_MM = 5;
    static final double COLD_MIN_C = 15;
    static final double HOT_MAX_C = 35;
    static final double UV_HIGH = 8;
    static final double WIND_STRONG_KMH = 40;

    static final ChecklistSuggestion RAINCOAT = new ChecklistSuggestion("Áo mưa", ChecklistCategory.OTHER);
    static final ChecklistSuggestion WARM_JACKET = new ChecklistSuggestion("Áo khoác ấm", ChecklistCategory.OTHER);
    static final ChecklistSuggestion SUNSCREEN = new ChecklistSuggestion("Kem chống nắng", ChecklistCategory.MEDICAL);

    private WeatherAdvice() {
    }

    public static List<Advice> of(DailyForecast f) {
        List<Advice> all = new ArrayList<>();
        if (WeatherCodes.condition(f.weatherCode()) == Condition.THUNDERSTORM) {
            all.add(new Advice(Type.STORM, "Có thể có dông – hạn chế hoạt động ngoài trời, trên biển", RAINCOAT));
        } else if (atLeast(f.precipProbability(), RAIN_PROBABILITY) || atLeast(f.precipSum(), RAIN_SUM_MM)) {
            String text = f.precipProbability() != null && f.precipProbability() >= RAIN_PROBABILITY
                    ? "Khả năng mưa " + f.precipProbability() + "% – nhớ mang áo mưa/ô"
                    : "Có thể mưa – nhớ mang áo mưa/ô";
            all.add(new Advice(Type.RAIN, text, RAINCOAT));
        }
        if (f.tempMin() != null && f.tempMin() <= COLD_MIN_C) {
            all.add(new Advice(Type.COLD, "Trời lạnh " + Math.round(f.tempMin()) + "°C – mang áo ấm", WARM_JACKET));
        }
        if (atLeast(f.tempMax(), HOT_MAX_C)) {
            all.add(new Advice(Type.HOT, "Nắng nóng " + Math.round(f.tempMax()) + "°C – uống đủ nước, tránh nắng trưa",
                    null));
        }
        if (atLeast(f.uvMax(), UV_HIGH)) {
            all.add(new Advice(Type.UV, "UV rất cao – nhớ kem chống nắng, mũ", SUNSCREEN));
        }
        if (atLeast(f.windMax(), WIND_STRONG_KMH)) {
            all.add(new Advice(Type.WIND, "Gió mạnh " + Math.round(f.windMax()) + " km/h – cân nhắc hoạt động trên biển",
                    null));
        }
        return List.copyOf(all.subList(0, Math.min(MAX_ADVICE, all.size())));
    }

    private static boolean atLeast(Number value, double threshold) {
        return value != null && value.doubleValue() >= threshold;
    }
}
