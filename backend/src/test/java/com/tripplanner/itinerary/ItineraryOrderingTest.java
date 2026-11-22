package com.tripplanner.itinerary;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class ItineraryOrderingTest {

    /** Item giả: tên + giờ (null = không giờ). */
    record It(String name, LocalTime time) {
        static It of(String name, String time) {
            return new It(name, time == null ? null : LocalTime.parse(time));
        }
    }

    private static List<String> names(List<It> items) {
        return items.stream().map(It::name).toList();
    }

    private final It breakfast = It.of("breakfast", "07:00");
    private final It cafe = It.of("cafe", null);
    private final It lake = It.of("lake", "14:00");

    @Test
    void newUntimedGoesLast() {
        It shopping = It.of("shopping", null);
        assertThat(names(ItineraryOrdering.place(List.of(breakfast, cafe, lake), shopping, It::time, false)))
                .containsExactly("breakfast", "cafe", "lake", "shopping");
    }

    @Test
    void timedInsertsBeforeFirstLaterTimedItem() {
        It market = It.of("market", "09:00");
        // Ví dụ trong SDD: [07:00, Cafe, 14:00] + 09:00 → [07:00, Cafe, 09:00, 14:00]
        assertThat(names(ItineraryOrdering.place(List.of(breakfast, cafe, lake), market, It::time, false)))
                .containsExactly("breakfast", "cafe", "market", "lake");
    }

    @Test
    void latestTimeGoesLast() {
        It dinner = It.of("dinner", "19:00");
        It freeTime = It.of("free", null);
        assertThat(names(ItineraryOrdering.place(List.of(breakfast, lake, freeTime), dinner, It::time, false)))
                .containsExactly("breakfast", "lake", "free", "dinner");
    }

    @Test
    void timedGoesLastWhenNoTimedItemsExist() {
        It market = It.of("market", "09:00");
        assertThat(names(ItineraryOrdering.place(List.of(cafe, It.of("walk", null)), market, It::time, false)))
                .containsExactly("cafe", "walk", "market");
    }

    @Test
    void sddScenarioStepByStep() {
        // Thêm lần lượt 07:00, Cafe, 14:00 rồi 09:00 → [07:00, Cafe, 09:00, 14:00]
        List<It> day = ItineraryOrdering.place(List.of(), breakfast, It::time, false);
        day = ItineraryOrdering.place(day, cafe, It::time, false);
        day = ItineraryOrdering.place(day, lake, It::time, false);
        day = ItineraryOrdering.place(day, It.of("market", "09:00"), It::time, false);
        assertThat(names(day)).containsExactly("breakfast", "cafe", "market", "lake");
    }

    @Test
    void equalTimeGoesAfterExisting() {
        It sameTime = It.of("same", "07:00");
        assertThat(names(ItineraryOrdering.place(List.of(breakfast, lake), sameTime, It::time, false)))
                .containsExactly("breakfast", "same", "lake");
    }

    @Test
    void editingTimeMovesItem() {
        // lake đổi giờ thành 06:00 (record bất biến → mô phỏng bằng item mới cùng vị trí)
        It earlyLake = It.of("lake", "06:00");
        List<It> current = List.of(breakfast, cafe, earlyLake);
        assertThat(names(ItineraryOrdering.place(current, earlyLake, It::time, true)))
                .containsExactly("lake", "breakfast", "cafe");
    }

    @Test
    void editingUntimedKeepsSlot() {
        assertThat(names(ItineraryOrdering.place(List.of(breakfast, cafe, lake), cafe, It::time, true)))
                .containsExactly("breakfast", "cafe", "lake");
    }

    @Test
    void emptyDay() {
        assertThat(names(ItineraryOrdering.place(List.of(), breakfast, It::time, false))).containsExactly("breakfast");
    }

    @Test
    void detectsBrokenTimeOrderIgnoringUntimed() {
        assertThat(ItineraryOrdering.isTimeOrderBroken(List.of(breakfast, cafe, lake), It::time)).isFalse();
        assertThat(ItineraryOrdering.isTimeOrderBroken(List.of(lake, cafe, breakfast), It::time)).isTrue();
        assertThat(ItineraryOrdering.isTimeOrderBroken(List.of(cafe), It::time)).isFalse();
    }
}
