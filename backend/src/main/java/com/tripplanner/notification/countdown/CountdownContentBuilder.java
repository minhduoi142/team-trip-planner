package com.tripplanner.notification.countdown;

import com.tripplanner.tripday.TripDayDressColor;
import com.tripplanner.weather.WeatherStatus;
import com.tripplanner.weather.dto.AdviceResponse;
import com.tripplanner.weather.dto.DayWeatherResponse;
import com.tripplanner.weather.dto.ForecastResponse;
import com.tripplanner.weather.dto.TripWeatherResponse;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Nội dung email đếm ngược (docs/sdd-email-notifications.md §7.3), chụp vào payload lúc tạo: ngày 1 của lịch trình,
 * dress code ngày 1, món chuẩn bị được giao cho người nhận mà chưa xong. Đọc bằng JDBC (chạy trong job, không cần
 * entity).
 */
@Component
public class CountdownContentBuilder {

    static final int MAX_ITEMS = 8;
    static final int MAX_CHECKLIST = 10;
    static final int MAX_WEATHER_DAYS = 3;
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final NamedParameterJdbcTemplate jdbc;

    public CountdownContentBuilder(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record TripInfo(long id, String title, String destination, String coverImageUrl, LocalDate startDate,
                           LocalDate endDate) {
    }

    /**
     * Phần chung cho mọi người nhận của 1 chuyến. {@code weather} null/không có ngày dự báo → không có khóa
     * {@code weather} (email bỏ khối thời tiết).
     */
    public Map<String, Object> shared(TripInfo trip, int daysLeft, int memberCount, TripWeatherResponse weather) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("tripTitle", trip.title());
        payload.put("destination", trip.destination());
        payload.put("daysLeft", daysLeft);
        payload.put("startDate", trip.startDate().toString());
        payload.put("endDate", trip.endDate() == null ? null : trip.endDate().toString());
        payload.put("coverImageUrl", trip.coverImageUrl());
        payload.put("memberCount", memberCount);
        payload.put("day1", day1(trip.id()));
        List<Map<String, Object>> weatherDays = weatherDays(weather);
        if (!weatherDays.isEmpty()) {
            payload.put("weather", weatherDays);
        }
        return payload;
    }

    /** Tối đa {@link #MAX_WEATHER_DAYS} ngày đầu có dự báo (docs/sdd-weather.md §6.3). */
    static List<Map<String, Object>> weatherDays(TripWeatherResponse weather) {
        if (weather == null) {
            return List.of();
        }
        List<Map<String, Object>> days = new ArrayList<>();
        for (DayWeatherResponse day : weather.days()) {
            if (days.size() >= MAX_WEATHER_DAYS) {
                break;
            }
            ForecastResponse f = day.forecast();
            if (day.status() != WeatherStatus.FORECAST || f == null) {
                continue;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("dayIndex", day.dayIndex());
            item.put("date", day.date() == null ? null : day.date().toString());
            item.put("placeName", day.placeName());
            item.put("emoji", f.condition().emoji());
            item.put("label", f.label());
            item.put("tempMin", f.tempMin());
            item.put("tempMax", f.tempMax());
            item.put("precipProbability", f.precipProbability());
            item.put("advice", f.advice().stream().map(AdviceResponse::text).toList());
            days.add(item);
        }
        return days;
    }

    /** Bản riêng cho 1 người nhận: thêm checklist của họ. */
    public Map<String, Object> forRecipient(Map<String, Object> shared, long tripId, long userId) {
        List<Map<String, Object>> items = jdbc.query("""
                        SELECT item_name, quantity FROM trip_checklists
                        WHERE trip_id = :tripId AND assignee_id = :userId AND is_checked = FALSE
                        ORDER BY id
                        """,
                new MapSqlParameterSource("tripId", tripId).addValue("userId", userId),
                (rs, i) -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("itemName", rs.getString("item_name"));
                    item.put("quantity", rs.getInt("quantity"));
                    return item;
                });
        Map<String, Object> payload = new LinkedHashMap<>(shared);
        payload.put("myChecklist", items.subList(0, Math.min(items.size(), MAX_CHECKLIST)));
        payload.put("myChecklistMore", Math.max(0, items.size() - MAX_CHECKLIST));
        return payload;
    }

    /** Ngày 1: các mục lịch trình (tối đa 8) + dress code. null nếu chưa có ngày 1. */
    private Map<String, Object> day1(long tripId) {
        MapSqlParameterSource trip = new MapSqlParameterSource("tripId", tripId);
        List<Map<String, Object>> days = jdbc.queryForList("""
                SELECT id, dress_theme, dress_note FROM trip_days WHERE trip_id = :tripId AND day_index = 1
                """, trip);
        if (days.isEmpty()) {
            return null;
        }
        long dayId = ((Number) days.get(0).get("id")).longValue();
        MapSqlParameterSource day = new MapSqlParameterSource("dayId", dayId);

        List<Map<String, Object>> items = new ArrayList<>(jdbc.query("""
                        SELECT start_time, title, location_name FROM itinerary_items
                        WHERE trip_day_id = :dayId ORDER BY sort_order, id
                        """, day,
                (rs, i) -> {
                    Map<String, Object> item = new HashMap<>();
                    LocalTime time = rs.getObject("start_time", LocalTime.class);
                    item.put("time", time == null ? null : TIME.format(time));
                    item.put("title", rs.getString("title"));
                    item.put("location", rs.getString("location_name"));
                    return item;
                }));
        List<String> colors = new ArrayList<>(jdbc.queryForList(
                "SELECT color_key FROM trip_day_dress_colors WHERE trip_day_id = :dayId", day, String.class));
        colors.sort(Comparator.comparingInt(TripDayDressColor.PALETTE::indexOf));   // thứ tự bảng màu như FE

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items.subList(0, Math.min(items.size(), MAX_ITEMS)));
        result.put("moreItems", Math.max(0, items.size() - MAX_ITEMS));
        result.put("dressTheme", days.get(0).get("dress_theme"));
        result.put("dressNote", days.get(0).get("dress_note"));
        result.put("dressColors", colors);
        return result;
    }
}
