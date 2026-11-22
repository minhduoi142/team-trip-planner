package com.tripplanner.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.support.IntegrationTest;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class ItineraryIntegrationTest extends IntegrationTest {

    private final LocalDate start = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(10);

    private String ownerToken;
    private String viewerToken;
    private long tripId;

    @BeforeEach
    void setUp() throws Exception {
        ownerToken = register("linh", "Linh");
        viewerToken = register("ngoc", "Ngọc");
        long viewerId = userId(viewerToken);

        Map<String, Object> body = new HashMap<>();
        body.put("title", "Đà Lạt");
        String created = mvc.perform(auth(post("/api/v1/trips"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        JsonNode trip = read(created);
        tripId = trip.get("id").asLong();
        mvc.perform(auth(post("/api/v1/trips/join/" + trip.get("inviteCode").asText()), viewerToken))
                .andExpect(status().isOk());
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("role", "VIEWER"))))
                .andExpect(status().isOk());
        lock(3);
    }

    @Test
    void addItemsAutoInsertByTimeAndTotals() throws Exception {
        long day1 = dayId(0);
        addItem(day1, "Ăn sáng", "07:00", 300_000L);
        addItem(day1, "Cafe", null, 50_000L);
        addItem(day1, "Hồ Xuân Hương", "14:00", null);
        JsonNode itinerary = addItem(day1, "Chợ Đà Lạt", "09:00", 200_000L);

        JsonNode day = itinerary.get("days").get(0);
        assertThat(titles(day)).containsExactly("Ăn sáng", "Cafe", "Chợ Đà Lạt", "Hồ Xuân Hương");
        assertThat(day.get("date").asText()).isEqualTo(start.toString());
        assertThat(day.get("totalCost").asLong()).isEqualTo(550_000L);
        assertThat(itinerary.get("totalCost").asLong()).isEqualTo(550_000L);
        assertThat(itinerary.get("tripDays").asInt()).isEqualTo(3);
        assertThat(day.get("items").get(0).get("startTime").asText()).isEqualTo("07:00");
        assertThat(day.get("items").get(0).get("createdByName").asText()).isEqualTo("Linh");
    }

    @Test
    void updateTimeRepositionsAndReorderWithinDay() throws Exception {
        long day1 = dayId(0);
        addItem(day1, "A", "07:00", null);
        addItem(day1, "B", "09:00", null);
        JsonNode itinerary = addItem(day1, "C", "11:00", null);
        long idC = itemId(itinerary, 0, "C");

        // Đổi C sang 06:00 → lên đầu
        JsonNode updated = send(put("/api/v1/itinerary-items/" + idC), ownerToken, itemBody("C", "06:00", null), 200);
        assertThat(titles(updated.get("days").get(0))).containsExactly("C", "A", "B");

        // Kéo thả: B, C, A → giờ lệch thứ tự → cảnh báo
        List<Long> order = List.of(itemId(updated, 0, "B"), idC, itemId(updated, 0, "A"));
        JsonNode reordered = send(put("/api/v1/trip-days/" + day1 + "/items/order"), ownerToken,
                Map.of("itemIds", order), 200);
        assertThat(titles(reordered.get("days").get(0))).containsExactly("B", "C", "A");
        assertThat(reordered.get("days").get(0).get("timeOrderBroken").asBoolean()).isTrue();

        // Thiếu item → INVALID_ORDER
        mvc.perform(auth(put("/api/v1/trip-days/" + day1 + "/items/order"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("itemIds", List.of(idC)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ORDER"));
    }

    @Test
    void moveItemToAnotherDayInsertsByTime() throws Exception {
        long day1 = dayId(0);
        long day2 = dayId(1);
        addItem(day2, "Sáng ngày 2", "08:00", null);
        addItem(day2, "Tối ngày 2", "19:00", null);
        JsonNode itinerary = addItem(day1, "Trưa", "12:00", null);
        long noon = itemId(itinerary, 0, "Trưa");

        JsonNode moved = send(post("/api/v1/itinerary-items/" + noon + "/move"), ownerToken, Map.of("dayId", day2), 200);
        assertThat(moved.get("days").get(0).get("items")).isEmpty();
        assertThat(titles(moved.get("days").get(1))).containsExactly("Sáng ngày 2", "Trưa", "Tối ngày 2");
    }

    @Test
    void viewerCanReadButNotWrite() throws Exception {
        long day1 = dayId(0);
        addItem(day1, "A", "07:00", null);
        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/itinerary"), viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days", hasSize(3)));
        mvc.perform(auth(post("/api/v1/trip-days/" + day1 + "/items"), viewerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(itemBody("X", null, null))))
                .andExpect(status().isForbidden());
    }

    @Test
    void endTimeRequiresStartTimeAndBadTimeFormat() throws Exception {
        long day1 = dayId(0);
        Map<String, Object> body = itemBody("X", null, null);
        body.put("endTime", "10:00");
        mvc.perform(auth(post("/api/v1/trip-days/" + day1 + "/items"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        body.put("startTime", "25:99");
        mvc.perform(auth(post("/api/v1/trip-days/" + day1 + "/items"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void dressCodeColors() throws Exception {
        long day1 = dayId(0);
        Map<String, Object> dress = new HashMap<>();
        dress.put("note", "Ngày bay");
        dress.put("dressTheme", "Trắng tinh khôi");
        dress.put("dressNote", "Váy trắng");
        dress.put("dressImageUrl", "https://img.example/a.jpg");
        dress.put("dressColors", List.of("beige", "white"));
        JsonNode itinerary = send(put("/api/v1/trip-days/" + day1), ownerToken, dress, 200);
        JsonNode day = itinerary.get("days").get(0);
        assertThat(day.get("note").asText()).isEqualTo("Ngày bay");
        assertThat(day.get("dress").get("theme").asText()).isEqualTo("Trắng tinh khôi");
        // Thứ tự theo bảng màu: white trước beige
        assertThat(day.get("dress").get("colors").toString()).isEqualTo("[\"white\",\"beige\"]");

        dress.put("dressColors", List.of("white", "neon-green"));
        mvc.perform(auth(put("/api/v1/trip-days/" + day1), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(dress)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DRESS_COLOR"));
        dress.put("dressColors", List.of("white", "black", "red", "navy", "mint"));
        mvc.perform(auth(put("/api/v1/trip-days/" + day1), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(dress)))
                .andExpect(jsonPath("$.code").value("INVALID_DRESS_COLOR"));
    }

    @Test
    void relockShorterKeepsOverflowDayWithContentAndDropsEmptyOne() throws Exception {
        addItem(dayId(1), "Ngày 2 có việc", "08:00", null);
        addItem(dayId(2), "Ngày 3 có việc", "08:00", null);

        // Mở lại → vẫn còn 3 ngày, chưa có ngày thực, lịch trình còn nguyên
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/lock-date"), ownerToken)).andExpect(status().isOk());
        JsonNode unlocked = itinerary();
        assertThat(unlocked.get("days")).hasSize(3);
        assertThat(unlocked.get("days").get(0).get("date").isNull()).isTrue();
        assertThat(unlocked.get("tripDays").isNull()).isTrue();

        // Chốt lại 1 ngày: ngày 2, 3 có nội dung → thành ngày thừa
        lock(1);
        JsonNode relocked = itinerary();
        assertThat(relocked.get("days")).hasSize(3);
        assertThat(relocked.get("days").get(1).get("overflow").asBoolean()).isTrue();
        assertThat(relocked.get("days").get(1).get("date").isNull()).isTrue();

        // Không xóa được ngày thường; xóa được ngày thừa
        mvc.perform(auth(delete("/api/v1/trip-days/" + dayId(0)), ownerToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DAY_NOT_OVERFLOW"));
        JsonNode afterDelete = send(delete("/api/v1/trip-days/" + relocked.get("days").get(2).get("id").asLong()),
                ownerToken, null, 200);
        assertThat(afterDelete.get("days")).hasSize(2);

        // Chuyển hoạt động từ ngày thừa sang Ngày 1
        long overflowItem = afterDelete.get("days").get(1).get("items").get(0).get("id").asLong();
        JsonNode moved = send(post("/api/v1/itinerary-items/" + overflowItem + "/move"), ownerToken,
                Map.of("dayId", dayId(0)), 200);
        assertThat(titles(moved.get("days").get(0))).containsExactly("Ngày 2 có việc");

        // Mở lại rồi chốt 1 ngày: ngày thừa giờ rỗng → bị xóa
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/lock-date"), ownerToken)).andExpect(status().isOk());
        lock(1);
        assertThat(itinerary().get("days")).hasSize(1);
    }

    @Test
    void deleteTripWithItineraryAndDressCode() throws Exception {
        addItem(dayId(0), "A", "07:00", 1000L);
        Map<String, Object> dress = new HashMap<>();
        dress.put("dressColors", List.of("white"));
        send(put("/api/v1/trip-days/" + dayId(0)), ownerToken, dress, 200);
        mvc.perform(auth(delete("/api/v1/trips/" + tripId), ownerToken)).andExpect(status().isNoContent());
        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/itinerary"), ownerToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    // ---------------------------------------------------------------- helpers

    private void lock(int days) throws Exception {
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/lock-date"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("startDate", start.toString(),
                                "endDate", start.plusDays(days - 1L).toString()))))
                .andExpect(status().isOk());
    }

    private JsonNode itinerary() throws Exception {
        return read(mvc.perform(auth(get("/api/v1/trips/" + tripId + "/itinerary"), ownerToken))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private long dayId(int index) throws Exception {
        return itinerary().get("days").get(index).get("id").asLong();
    }

    private JsonNode addItem(long dayId, String title, String startTime, Long cost) throws Exception {
        return send(post("/api/v1/trip-days/" + dayId + "/items"), ownerToken, itemBody(title, startTime, cost), 201);
    }

    private static Map<String, Object> itemBody(String title, String startTime, Long cost) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", title);
        body.put("category", "SIGHTSEEING");
        body.put("startTime", startTime);
        body.put("estimatedCost", cost);
        return body;
    }

    private JsonNode send(MockHttpServletRequestBuilder request, String token, Object body, int expected)
            throws Exception {
        MockHttpServletRequestBuilder builder = auth(request, token);
        if (body != null) {
            builder = builder.contentType(MediaType.APPLICATION_JSON).content(json(body));
        }
        return read(mvc.perform(builder).andExpect(status().is(expected))
                .andReturn().getResponse().getContentAsString());
    }

    private static List<String> titles(JsonNode day) {
        List<String> result = new ArrayList<>();
        day.get("items").forEach(item -> result.add(item.get("title").asText()));
        return result;
    }

    private static long itemId(JsonNode itinerary, int dayIndex, String title) {
        for (JsonNode item : itinerary.get("days").get(dayIndex).get("items")) {
            if (item.get("title").asText().equals(title)) {
                return item.get("id").asLong();
            }
        }
        throw new AssertionError("Không thấy item " + title);
    }
}
