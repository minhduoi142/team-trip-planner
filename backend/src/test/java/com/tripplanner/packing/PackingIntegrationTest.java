package com.tripplanner.packing;

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
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class PackingIntegrationTest extends IntegrationTest {

    private String ownerToken;
    private String viewerToken;
    private long viewerId;
    private long tripId;

    @BeforeEach
    void setUp() throws Exception {
        ownerToken = register("linh", "Linh");
        viewerToken = register("ngoc", "Ngọc");
        viewerId = userId(viewerToken);
        JsonNode trip = send(post("/api/v1/trips"), ownerToken, Map.of("title", "Đà Lạt"), 201);
        tripId = trip.get("id").asLong();
        send(post("/api/v1/trips/join/" + trip.get("inviteCode").asText()), viewerToken, null, 200);
        send(patch("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken, Map.of("role", "VIEWER"), 200);
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

    private JsonNode add(String token, String name, String category, Integer quantity, int expected) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("itemName", name);
        body.put("category", category);
        body.put("quantity", quantity);
        return send(post("/api/v1/trips/" + tripId + "/packing"), token, body, expected);
    }

    private static long idOf(JsonNode list, String name) {
        for (JsonNode item : list.get("items")) {
            if (item.get("itemName").asText().equals(name)) {
                return item.get("id").asLong();
            }
        }
        throw new AssertionError("không có món " + name);
    }

    @Test
    void viewerManagesOwnListSortedByCategory() throws Exception {
        add(viewerToken, "Sạc dự phòng", "ELECTRONICS", null, 201);
        JsonNode list = add(viewerToken, "  Váy trắng  ", "CLOTHES", 2, 201);
        assertThat(list.get("total").asInt()).isEqualTo(2);
        assertThat(list.get("packedCount").asInt()).isZero();
        // Nhóm theo thứ tự enum: CLOTHES trước ELECTRONICS
        assertThat(list.get("items").get(0).get("itemName").asText()).isEqualTo("Váy trắng");
        assertThat(list.get("items").get(0).get("quantity").asInt()).isEqualTo(2);
        assertThat(list.get("items").get(1).get("quantity").asInt()).isEqualTo(1);

        long dress = idOf(list, "Váy trắng");
        list = send(patch("/api/v1/packing-items/" + dress + "/packed"), viewerToken, Map.of("packed", true), 200);
        assertThat(list.get("packedCount").asInt()).isEqualTo(1);

        list = send(put("/api/v1/packing-items/" + dress), viewerToken,
                Map.of("itemName", "Váy maxi trắng", "category", "CLOTHES", "quantity", 1), 200);
        assertThat(list.get("items").get(0).get("itemName").asText()).isEqualTo("Váy maxi trắng");
        assertThat(list.get("items").get(0).get("packed").asBoolean()).isTrue();   // sửa không bỏ tích

        list = send(delete("/api/v1/packing-items/" + dress), viewerToken, null, 200);
        assertThat(list.get("total").asInt()).isEqualTo(1);

        // Validation
        add(viewerToken, "", "OTHER", null, 400);
        add(viewerToken, "Tất", null, null, 400);
        add(viewerToken, "Tất", "OTHER", 100, 400);
        add(viewerToken, "x".repeat(151), "OTHER", null, 400);
    }

    @Test
    void listIsPrivate() throws Exception {
        long mine = idOf(add(viewerToken, "Băng vệ sinh", "HEALTH", null, 201), "Băng vệ sinh");

        // Trưởng nhóm cũng không thấy, không sửa/tích/xóa được (404 như không tồn tại)
        JsonNode ownerList = send(get("/api/v1/trips/" + tripId + "/packing"), ownerToken, null, 200);
        assertThat(ownerList.get("items")).isEmpty();
        mvc.perform(auth(patch("/api/v1/packing-items/" + mine + "/packed"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("packed", true))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PACKING_ITEM_NOT_FOUND"));
        send(put("/api/v1/packing-items/" + mine), ownerToken,
                Map.of("itemName", "x", "category", "OTHER"), 404);
        send(delete("/api/v1/packing-items/" + mine), ownerToken, null, 404);
        assertThat(send(get("/api/v1/trips/" + tripId + "/packing"), viewerToken, null, 200).get("total").asInt())
                .isEqualTo(1);

        // Người ngoài chuyến
        String stranger = register("lan", "Lan");
        send(get("/api/v1/trips/" + tripId + "/packing"), stranger, null, 403);
        add(stranger, "Tất", "OTHER", null, 403);
    }

    @Test
    void templatesSkipDuplicatesIgnoringAccents() throws Exception {
        add(viewerToken, "kem chong nang", "BEAUTY", null, 201);   // gõ không dấu

        JsonNode list = send(post("/api/v1/trips/" + tripId + "/packing/templates/BEAUTY"), viewerToken, null, 200);
        int beauty = PackingTemplates.find("BEAUTY").orElseThrow().items().size();
        assertThat(list.get("addedCount").asInt()).isEqualTo(beauty - 1);   // "Kem chống nắng" đã có
        assertThat(list.get("total").asInt()).isEqualTo(beauty);

        // Lần 2: không thêm gì
        list = send(post("/api/v1/trips/" + tripId + "/packing/templates/beauty"), viewerToken, null, 200);
        assertThat(list.get("addedCount").asInt()).isZero();

        // Mẫu chồng một phần: BEACH có "Kem chống nắng"
        int beach = PackingTemplates.find("BEACH").orElseThrow().items().size();
        list = send(post("/api/v1/trips/" + tripId + "/packing/templates/BEACH"), viewerToken, null, 200);
        assertThat(list.get("addedCount").asInt()).isEqualTo(beach - 1);

        send(post("/api/v1/trips/" + tripId + "/packing/templates/KHONG_CO"), viewerToken, null, 404);

        JsonNode templates = send(get("/api/v1/packing-templates"), viewerToken, null, 200);
        assertThat(templates).hasSize(6);
        assertThat(templates.get(0).get("label").asText()).isEqualTo("Thiết yếu");
    }

    @Test
    void limitIs200ItemsAndTemplateDoesNotPartiallyAdd() throws Exception {
        jdbc.update("""
                INSERT INTO packing_items (trip_id, user_id, category, item_name, quantity, is_packed, created_at)
                WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 198)
                SELECT ?, ?, 'OTHER', CONCAT('Món ', n), 1, FALSE, UTC_TIMESTAMP(6) FROM seq""", tripId, viewerId);
        add(viewerToken, "Món 199", "OTHER", null, 201);
        add(viewerToken, "Món 200", "OTHER", null, 201);
        mvc.perform(auth(post("/api/v1/trips/" + tripId + "/packing"), viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("itemName", "Món 201", "category", "OTHER"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PACKING_LIMIT_REACHED"));

        send(delete("/api/v1/packing-items/" + idOf(
                send(get("/api/v1/trips/" + tripId + "/packing"), viewerToken, null, 200), "Món 200")),
                viewerToken, null, 200);
        send(post("/api/v1/trips/" + tripId + "/packing/templates/ESSENTIALS"), viewerToken, null, 400);
        assertThat(send(get("/api/v1/trips/" + tripId + "/packing"), viewerToken, null, 200).get("total").asInt())
                .isEqualTo(199);
    }

    @Test
    void leavingTheTripRemovesTheList() throws Exception {
        add(viewerToken, "Tất", "CLOTHES", null, 201);
        add(ownerToken, "Sạc", "ELECTRONICS", null, 201);

        send(delete("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken, null, 204);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM packing_items WHERE user_id = ?", Integer.class,
                viewerId)).isZero();

        send(delete("/api/v1/trips/" + tripId), ownerToken, null, 204);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM packing_items", Integer.class)).isZero();
    }
}
