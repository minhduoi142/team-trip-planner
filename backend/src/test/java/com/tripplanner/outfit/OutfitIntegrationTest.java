package com.tripplanner.outfit;

import static org.assertj.core.api.Assertions.assertThat;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class OutfitIntegrationTest extends IntegrationTest {

    private static final LocalDate START = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(10);
    private static final String IMG = "http://minio.test/trip-planner/outfit/2026/11/";

    private String ownerToken;
    private String editorToken;
    private String viewerToken;
    private long editorId;
    private long viewerId;
    private long tripId;
    private long day1;
    private long day2;

    @BeforeEach
    void setUp() throws Exception {
        ownerToken = register("linh", "Linh");
        editorToken = register("mai", "Mai");
        viewerToken = register("ngoc", "Ngọc");
        editorId = userId(editorToken);
        viewerId = userId(viewerToken);
        JsonNode trip = send(post("/api/v1/trips"), ownerToken, Map.of("title", "Phú Quốc",
                "plannedStartDate", START.toString(), "plannedEndDate", START.plusDays(2).toString()), 201);
        tripId = trip.get("id").asLong();
        String code = trip.get("inviteCode").asText();
        send(post("/api/v1/trips/join/" + code), editorToken, null, 200);
        send(post("/api/v1/trips/join/" + code), viewerToken, null, 200);
        send(patch("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken, Map.of("role", "VIEWER"), 200);
        lock(START, START.plusDays(2));
        JsonNode days = send(get("/api/v1/trips/" + tripId + "/days"), ownerToken, null, 200);
        day1 = days.get(0).get("id").asLong();
        day2 = days.get(1).get("id").asLong();
    }

    private void lock(LocalDate from, LocalDate to) throws Exception {
        send(patch("/api/v1/trips/" + tripId + "/lock-date"), ownerToken,
                Map.of("startDate", from.toString(), "endDate", to.toString()), 200);
    }

    private JsonNode send(MockHttpServletRequestBuilder request, String token, Object body, int expected)
            throws Exception {
        MockHttpServletRequestBuilder r = auth(request, token);
        if (body != null) {
            r = r.contentType(MediaType.APPLICATION_JSON).content(json(body));
        }
        String content = mvc.perform(r).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        return content.isEmpty() ? null : read(content);
    }

    private static Map<String, Object> outfit(List<String> photos, List<String> colors, String note) {
        Map<String, Object> body = new HashMap<>();
        body.put("photoUrls", photos);
        body.put("colors", colors);
        body.put("note", note);
        return body;
    }

    private JsonNode saveMine(String token, long dayId, Map<String, Object> body, int expected) throws Exception {
        return send(put("/api/v1/trip-days/" + dayId + "/outfits/me"), token, body, expected);
    }

    private static JsonNode day(JsonNode board, long dayId) {
        for (JsonNode d : board.get("days")) {
            if (d.get("dayId").asLong() == dayId) {
                return d;
            }
        }
        throw new AssertionError("không có ngày " + dayId);
    }

    @Test
    void viewerPostsOwnOutfitAndReplacingKeepsPhotoOrder() throws Exception {
        JsonNode board = saveMine(viewerToken, day1,
                outfit(List.of(IMG + "a.webp", IMG + "b.webp"), List.of("white", "beige"), "  váy trắng + mũ cói "),
                200);
        assertThat(board.get("days")).hasSize(3);
        JsonNode mine = day(board, day1).get("outfits").get(0);
        assertThat(mine.get("userId").asLong()).isEqualTo(viewerId);
        assertThat(mine.get("displayName").asText()).isEqualTo("Ngọc");
        assertThat(mine.get("mine").asBoolean()).isTrue();
        assertThat(mine.get("canDelete").asBoolean()).isTrue();
        assertThat(mine.get("note").asText()).isEqualTo("váy trắng + mũ cói");
        assertThat(mine.get("photoUrls").get(1).asText()).isEqualTo(IMG + "b.webp");
        assertThat(mine.get("colors")).extracting(JsonNode::asText).containsExactly("white", "beige");
        assertThat(day(board, day2).get("outfits")).isEmpty();

        // Gửi lại: thay toàn bộ, thứ tự ảnh theo request
        board = saveMine(viewerToken, day1,
                outfit(List.of(IMG + "c.webp", IMG + "a.webp", IMG + "d.webp"), List.of("navy"), null), 200);
        mine = day(board, day1).get("outfits").get(0);
        assertThat(mine.get("photoUrls")).extracting(JsonNode::asText)
                .containsExactly(IMG + "c.webp", IMG + "a.webp", IMG + "d.webp");
        assertThat(mine.get("colors")).extracting(JsonNode::asText).containsExactly("navy");
        assertThat(mine.get("note").isNull()).isTrue();
        assertThat(day(board, day1).get("outfits")).hasSize(1);

        // Chỉ màu, không ảnh, không ghi chú vẫn hợp lệ
        saveMine(editorToken, day1, outfit(List.of(), List.of("white"), null), 200);
        JsonNode asOwner = send(get("/api/v1/trips/" + tripId + "/outfits"), ownerToken, null, 200);
        JsonNode outfits = day(asOwner, day1).get("outfits");
        assertThat(outfits).hasSize(2);
        // Người xem không có outfit → không có "của mình" đứng đầu; mới sửa đứng trước
        assertThat(outfits.get(0).get("userId").asLong()).isEqualTo(editorId);
        assertThat(outfits.get(0).get("mine").asBoolean()).isFalse();
        assertThat(outfits.get(0).get("canDelete").asBoolean()).isTrue();   // OWNER
    }

    @Test
    void invalidOutfitsAreRejected() throws Exception {
        saveMine(viewerToken, day1, outfit(List.of(IMG + "1", IMG + "2", IMG + "3", IMG + "4", IMG + "5"), null, null),
                400);
        mvc.perform(auth(put("/api/v1/trip-days/" + day1 + "/outfits/me"), viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(outfit(null, List.of("white", "black", "red", "navy"), null))))
                .andExpect(status().isBadRequest());
        mvc.perform(auth(put("/api/v1/trip-days/" + day1 + "/outfits/me"), viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(outfit(null, List.of("cam-sua"), null))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DRESS_COLOR"));
        saveMine(viewerToken, day1, outfit(List.of("javascript:alert(1)"), null, null), 400);
        saveMine(viewerToken, day1, outfit(List.of(), List.of(), "   "), 400);
        saveMine(viewerToken, day1, outfit(null, null, "x".repeat(301)), 400);
    }

    @Test
    void accessRules() throws Exception {
        saveMine(viewerToken, day1, outfit(List.of(IMG + "a.webp"), null, null), 200);

        String stranger = register("lan", "Lan");
        send(get("/api/v1/trips/" + tripId + "/outfits"), stranger, null, 403);
        saveMine(stranger, day1, outfit(null, List.of("white"), null), 403);
        saveMine(viewerToken, 999_999L, outfit(null, List.of("white"), null), 404);

        // EDITOR không gỡ được outfit người khác; OWNER thì được
        send(delete("/api/v1/trip-days/" + day1 + "/outfits/" + viewerId), editorToken, null, 403);
        JsonNode board = send(delete("/api/v1/trip-days/" + day1 + "/outfits/" + viewerId), ownerToken, null, 200);
        assertThat(day(board, day1).get("outfits")).isEmpty();

        // Gỡ của mình: idempotent
        saveMine(editorToken, day2, outfit(null, List.of("red"), null), 200);
        send(delete("/api/v1/trip-days/" + day2 + "/outfits/me"), editorToken, null, 200);
        board = send(delete("/api/v1/trip-days/" + day2 + "/outfits/me"), editorToken, null, 200);
        assertThat(day(board, day2).get("outfits")).isEmpty();
    }

    @Test
    void leavingRemovesOutfitsAndShorteningKeepsDayWithOutfitAsOverflow() throws Exception {
        saveMine(viewerToken, day1, outfit(null, List.of("white"), null), 200);
        saveMine(editorToken, day2, outfit(null, List.of("mint"), null), 200);
        long day3 = send(get("/api/v1/trips/" + tripId + "/days"), ownerToken, null, 200).get(2).get("id").asLong();
        saveMine(editorToken, day3, outfit(null, List.of("sky"), "ngày cuối"), 200);

        // Loại Ngọc khỏi nhóm → outfit của Ngọc mất
        send(delete("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken, null, 204);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM day_outfits WHERE user_id = ?", Integer.class, viewerId))
                .isZero();

        // Mở khóa rồi chốt lại còn 2 ngày: Ngày 3 có outfit → thành ngày thừa, không bị xóa
        send(delete("/api/v1/trips/" + tripId + "/lock-date"), ownerToken, null, 200);
        lock(START, START.plusDays(1));
        JsonNode days = send(get("/api/v1/trips/" + tripId + "/days"), ownerToken, null, 200);
        assertThat(days).hasSize(3);
        assertThat(days.get(2).get("overflow").asBoolean()).isTrue();

        // Xóa ngày thừa → outfit đi theo (CASCADE); xóa chuyến vẫn được
        send(delete("/api/v1/trip-days/" + day3), ownerToken, null, 200);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM day_outfit_colors WHERE trip_day_id = ?", Integer.class,
                day3)).isZero();
        send(delete("/api/v1/trips/" + tripId), ownerToken, null, 204);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM day_outfits", Integer.class)).isZero();
    }

    @Test
    void outfitPhotosCanBeUploadedWithOutfitPurpose() throws Exception {
        // Kiểm CHECK của media_files nhận 'OUTFIT' (V12)
        jdbc.update("""
                INSERT INTO media_files (object_key, purpose, content_type, size_bytes, created_at)
                VALUES ('outfit/2026/11/x.webp', 'OUTFIT', 'image/webp', 10, UTC_TIMESTAMP(6))""");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM media_files WHERE purpose = 'OUTFIT'", Integer.class))
                .isEqualTo(1);
    }
}
