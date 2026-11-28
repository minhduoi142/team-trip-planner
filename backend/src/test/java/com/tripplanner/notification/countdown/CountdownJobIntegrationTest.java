package com.tripplanner.notification.countdown;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.notification.mail.MailGateway;
import com.tripplanner.support.IntegrationTest;
import com.tripplanner.weather.WeatherUnavailableException;
import com.tripplanner.weather.model.DailyForecast;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

class CountdownJobIntegrationTest extends IntegrationTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    @MockitoBean
    private MailGateway mailGateway;

    @Autowired
    private CountdownJob job;

    private long linh;
    private long mai;
    private long tripId;

    @BeforeEach
    void setUp() throws Exception {
        given(mailGateway.isConfigured()).willReturn(true);
        String linhToken = register("linh", "Linh");
        String maiToken = register("mai", "Mai");
        linh = userId(linhToken);
        mai = userId(maiToken);
        JsonNode trip = read(mvc.perform(auth(post("/api/v1/trips"), linhToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Phú Quốc 2026", "destination", "Phú Quốc"))))
                .andExpect(MockMvcResultMatchers.status().isCreated()).andReturn().getResponse().getContentAsString());
        tripId = trip.get("id").asLong();
        mvc.perform(auth(post("/api/v1/trips/join/" + trip.get("inviteCode").asText()), maiToken))
                .andExpect(MockMvcResultMatchers.status().isOk());
        jdbc.update("UPDATE users SET notify_email = CONCAT(username, '@example.com')");
        jdbc.update("DELETE FROM notifications");   // bỏ thông báo "Mai đã vào nhóm"
    }

    @Test
    void milestoneCreatesOneRowPerMemberAndIsIdempotent() throws Exception {
        lock(TODAY.plusDays(3));
        seedDay1();
        // Hành lý cá nhân: chỉ món chưa xếp của đúng người nhận vào email
        jdbc.update("""
                INSERT INTO packing_items (trip_id, user_id, category, item_name, quantity, is_packed, created_at)
                VALUES (?, ?, 'ELECTRONICS', 'Sạc dự phòng', 2, FALSE, UTC_TIMESTAMP(6)),
                       (?, ?, 'CLOTHES', 'Đồ bơi', 1, TRUE, UTC_TIMESTAMP(6))""", tripId, mai, tripId, mai);

        assertThat(job.runFor(TODAY)).isEqualTo(2);
        assertThat(job.runFor(TODAY)).isZero();   // chạy lại (gửi bù) không trùng
        assertThat(recipients()).containsExactlyInAnyOrder(linh, mai);

        JsonNode forMai = payload(mai);
        assertThat(forMai.get("daysLeft").asInt()).isEqualTo(3);
        assertThat(forMai.get("tripTitle").asText()).isEqualTo("Phú Quốc 2026");
        assertThat(forMai.get("memberCount").asInt()).isEqualTo(2);
        JsonNode day1 = forMai.get("day1");
        assertThat(day1.get("items")).hasSize(2);
        assertThat(day1.get("items").get(0).get("time").asText()).isEqualTo("07:30");
        assertThat(day1.get("items").get(0).get("title").asText()).isEqualTo("Bay VJ321");
        assertThat(day1.get("dressTheme").asText()).isEqualTo("Biển xanh");
        assertThat(day1.get("dressColors").toString()).isEqualTo("[\"white\",\"navy\"]");   // thứ tự bảng màu
        assertThat(forMai.get("myChecklist")).hasSize(1);
        assertThat(forMai.get("myChecklist").get(0).get("itemName").asText()).isEqualTo("Kem chống nắng");
        assertThat(payload(linh).get("myChecklist")).isEmpty();   // checklist riêng từng người
        assertThat(forMai.get("myPacking")).hasSize(1);
        assertThat(forMai.get("myPacking").get(0).get("itemName").asText()).isEqualTo("Sạc dự phòng");
        assertThat(forMai.get("myPacking").get(0).get("quantity").asInt()).isEqualTo(2);
        assertThat(forMai.get("myPackingMore").asInt()).isZero();
        assertThat(payload(linh).get("myPacking")).isEmpty();   // hành lý riêng tư

        assertThat(jdbc.queryForObject("SELECT send_after <= UTC_TIMESTAMP(6) FROM notifications LIMIT 1",
                Boolean.class)).isTrue();   // gửi ngay ở lượt dispatcher kế tiếp
    }

    @Test
    void onlyMilestoneDaysAndLockedTrips() {
        assertThat(job.runFor(TODAY)).isZero();   // chưa chốt ngày

        lock(TODAY.plusDays(2));
        assertThat(job.runFor(TODAY)).isZero();   // D-2 không phải mốc

        lock(TODAY.minusDays(1));
        assertThat(job.runFor(TODAY)).isZero();   // đã đi rồi

        lock(TODAY);
        assertThat(job.runFor(TODAY)).isEqualTo(2);
        assertThat(payload(linh).get("daysLeft").asInt()).isZero();
        assertThat(payload(linh).get("day1").isNull()).isTrue();   // chưa có ngày 1
    }

    @Test
    void relockingToAnotherDateCountsAgain() {
        lock(TODAY.plusDays(7));
        assertThat(job.runFor(TODAY)).isEqualTo(2);

        lock(TODAY.plusDays(1));
        assertThat(job.runFor(TODAY)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notifications", Integer.class)).isEqualTo(4);
    }

    @Test
    void respectsEmailPrefsAndTripMute() {
        lock(TODAY.plusDays(1));
        jdbc.update("""
                INSERT INTO user_notification_prefs
                    (user_id, email_enabled, countdown_enabled, member_enabled, expense_enabled, updated_at)
                VALUES (?, TRUE, FALSE, TRUE, TRUE, UTC_TIMESTAMP(6))
                """, linh);
        jdbc.update("INSERT INTO trip_notification_mutes (trip_id, user_id, created_at) VALUES (?, ?, UTC_TIMESTAMP(6))",
                tripId, mai);
        assertThat(job.runFor(TODAY)).isZero();

        jdbc.update("DELETE FROM trip_notification_mutes");
        jdbc.update("UPDATE users SET notify_email = NULL WHERE id = ?", mai);
        assertThat(job.runFor(TODAY)).isZero();

        jdbc.update("UPDATE users SET notify_email = 'mai@example.com' WHERE id = ?", mai);
        assertThat(job.runFor(TODAY)).isEqualTo(1);
        assertThat(recipients()).containsExactly(mai);
    }

    @Test
    void payloadCarriesWeatherWhenForecastIsAvailable() throws Exception {
        // Tọa độ riêng cho test này: cache thời tiết là bean dùng chung giữa các test
        jdbc.update("UPDATE trips SET destination_lat = 10.31, destination_lon = 103.91 WHERE id = ?", tripId);
        given(weatherProvider.forecast(any())).willReturn(List.of(
                new DailyForecast(TODAY.plusDays(3), 95, 24.2, 29.6, 85, 18.0, 20.0, 9.0)));
        lock(TODAY.plusDays(3));
        seedDay1();

        assertThat(job.runFor(TODAY)).isEqualTo(2);

        JsonNode weather = payload(linh).get("weather");
        assertThat(weather).hasSize(1);
        assertThat(weather.get(0).get("dayIndex").asInt()).isEqualTo(1);
        assertThat(weather.get(0).get("date").asText()).isEqualTo(TODAY.plusDays(3).toString());
        assertThat(weather.get(0).get("emoji").asText()).isEqualTo("⛈️");
        assertThat(weather.get(0).get("label").asText()).isEqualTo("Dông");
        assertThat(weather.get(0).get("placeName").asText()).isEqualTo("Phú Quốc");
        assertThat(weather.get(0).get("advice").get(0).asText()).startsWith("Có thể có dông");
    }

    @Test
    void weatherOutageOnlyDropsTheWeatherBlock() throws Exception {
        jdbc.update("UPDATE trips SET destination_lat = 10.42, destination_lon = 103.82 WHERE id = ?", tripId);
        given(weatherProvider.forecast(any())).willThrow(new WeatherUnavailableException("timeout"));
        lock(TODAY.plusDays(1));
        seedDay1();

        assertThat(job.runFor(TODAY)).isEqualTo(2);   // email đếm ngược vẫn được tạo

        assertThat(payload(linh).has("weather")).isFalse();
        assertThat(payload(linh).get("day1").get("items")).hasSize(2);
    }

    // ---------------------------------------------------------------- helpers

    private void lock(LocalDate start) {
        jdbc.update("UPDATE trips SET start_date = ?, end_date = ? WHERE id = ?", start, start.plusDays(2), tripId);
    }

    private void seedDay1() {
        jdbc.update("""
                INSERT INTO trip_days (trip_id, day_index, dress_theme) VALUES (?, 1, 'Biển xanh')
                """, tripId);
        long dayId = jdbc.queryForObject("SELECT id FROM trip_days WHERE trip_id = ? AND day_index = 1",
                Long.class, tripId);
        jdbc.update("""
                INSERT INTO itinerary_items (trip_day_id, title, category, start_time, location_name, sort_order,
                                             created_at, updated_at)
                VALUES (?, 'Nhận phòng', 'STAY', '14:00', NULL, 1, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
                       (?, 'Bay VJ321', 'TRANSPORT', '07:30', 'Tân Sơn Nhất', 0, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))
                """, dayId, dayId);
        jdbc.update("INSERT INTO trip_day_dress_colors (trip_day_id, color_key) VALUES (?, 'navy'), (?, 'white')",
                dayId, dayId);
        jdbc.update("""
                INSERT INTO trip_checklists (trip_id, category, item_name, quantity, assignee_id, is_checked, created_at)
                VALUES (?, 'MEDICAL', 'Kem chống nắng', 2, ?, FALSE, UTC_TIMESTAMP(6)),
                       (?, 'SHARED', 'Loa bluetooth', 1, ?, TRUE, UTC_TIMESTAMP(6))
                """, tripId, mai, tripId, mai);
    }

    private List<Long> recipients() {
        return jdbc.queryForList("SELECT user_id FROM notifications WHERE type = 'COUNTDOWN' ORDER BY id", Long.class);
    }

    private JsonNode payload(long userId) {
        try {
            return read(jdbc.queryForObject("""
                    SELECT payload FROM notifications WHERE type = 'COUNTDOWN' AND user_id = ? ORDER BY id DESC LIMIT 1
                    """, String.class, userId));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
