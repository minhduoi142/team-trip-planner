package com.tripplanner.weather.dto;

import com.tripplanner.checklist.ChecklistCategory;
import com.tripplanner.weather.WeatherAdvice;

/**
 * Gợi ý từ dự báo ({@link WeatherAdvice}). {@code checklistItem} null = không có món nên mang (vd nắng nóng, gió).
 */
public record AdviceResponse(WeatherAdvice.Type type, String text, ChecklistItemSuggestion checklistItem) {

    public record ChecklistItemSuggestion(String itemName, ChecklistCategory category) {
    }

    public static AdviceResponse from(WeatherAdvice.Advice advice) {
        WeatherAdvice.ChecklistSuggestion item = advice.checklistItem();
        return new AdviceResponse(advice.type(), advice.text(),
                item == null ? null : new ChecklistItemSuggestion(item.itemName(), item.category()));
    }
}
