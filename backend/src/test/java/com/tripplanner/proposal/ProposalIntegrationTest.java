package com.tripplanner.proposal;

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
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class ProposalIntegrationTest extends IntegrationTest {

    private String ownerToken;
    private String editorToken;
    private String viewerToken;
    private long tripId;
    private long viewerId;

    @BeforeEach
    void setUp() throws Exception {
        ownerToken = register("linh", "Linh");
        editorToken = register("mai", "Mai");
        viewerToken = register("ngoc", "Ngọc");
        viewerId = userId(viewerToken);
        JsonNode trip = read(mvc.perform(auth(post("/api/v1/trips"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", "Đà Lạt"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        tripId = trip.get("id").asLong();
        String code = trip.get("inviteCode").asText();
        // Vào bằng link mời = EDITOR; hạ ngoc xuống VIEWER
        mvc.perform(auth(post("/api/v1/trips/join/" + code), editorToken)).andExpect(status().isOk());
        mvc.perform(auth(post("/api/v1/trips/join/" + code), viewerToken)).andExpect(status().isOk());
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("role", "VIEWER"))))
                .andExpect(status().isOk());
    }

    @Test
    void viewerAddsAndVotesAndListIsSortedByVotes() throws Exception {
        long cafe = id(create(viewerToken, "Cà phê Túi Mơ To", "FOOD"), "Cà phê Túi Mơ To");
        JsonNode both = create(editorToken, "Đồi chè Cầu Đất", "SIGHTSEEING");
        long doiChe = id(both, "Đồi chè Cầu Đất");
        assertThat(both.get("proposals")).hasSize(2);
        // Chưa có tim → cũ hơn đứng trước
        assertThat(both.get("proposals").get(0).get("id").asLong()).isEqualTo(cafe);
        assertThat(both.get("canSchedule").asBoolean()).isTrue();
        assertThat(both.get("tripLocked").asBoolean()).isFalse();

        // Không chặn trùng tên
        create(ownerToken, "cà phê túi mơ to", "FOOD");

        // Tim idempotent; nhiều tim hơn → lên đầu
        send(put("/api/v1/proposals/" + doiChe + "/vote"), viewerToken, null, 200);
        send(put("/api/v1/proposals/" + doiChe + "/vote"), viewerToken, null, 200);
        JsonNode voted = send(put("/api/v1/proposals/" + doiChe + "/vote"), ownerToken, null, 200);
        JsonNode first = voted.get("proposals").get(0);
        assertThat(first.get("id").asLong()).isEqualTo(doiChe);
        assertThat(first.get("voteCount").asInt()).isEqualTo(2);
        assertThat(first.get("votedByMe").asBoolean()).isTrue();

        JsonNode unvoted = send(delete("/api/v1/proposals/" + doiChe + "/vote"), viewerToken, null, 200);
        assertThat(unvoted.get("proposals").get(0).get("voteCount").asInt()).isEqualTo(1);
        assertThat(unvoted.get("canSchedule").asBoolean()).isFalse();   // VIEWER
        send(delete("/api/v1/proposals/" + doiChe + "/vote"), viewerToken, null, 200);

        // Validation link
        Map<String, Object> bad = body("X", "FOOD");
        bad.put("referenceUrl", "tiktok.com/abc");
        mvc.perform(auth(post("/api/v1/trips/" + tripId + "/proposals"), viewerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(bad)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void onlyAuthorOrOwnerCanEditAndDelete() throws Exception {
        long cafe = id(create(viewerToken, "Cà phê", "FOOD"), "Cà phê");

        // EDITOR không phải người tạo → 403
        send(put("/api/v1/proposals/" + cafe), editorToken, body("Sửa bậy", "FOOD"), 403);
        send(delete("/api/v1/proposals/" + cafe), editorToken, null, 403);

        // Người tạo (VIEWER) sửa được
        Map<String, Object> edit = body("Cà phê Túi Mơ To", "FOOD");
        edit.put("referenceUrl", "https://www.tiktok.com/@dalat/video/1");
        edit.put("estimatedCost", 60000);
        JsonNode edited = send(put("/api/v1/proposals/" + cafe), viewerToken, edit, 200);
        JsonNode p = edited.get("proposals").get(0);
        assertThat(p.get("title").asText()).isEqualTo("Cà phê Túi Mơ To");
        assertThat(p.get("referenceUrl").asText()).startsWith("https://www.tiktok.com");
        assertThat(p.get("canEdit").asBoolean()).isTrue();

        JsonNode asEditor = send(get("/api/v1/trips/" + tripId + "/proposals"), editorToken, null, 200);
        assertThat(asEditor.get("proposals").get(0).get("canDelete").asBoolean()).isFalse();

        // OWNER xóa được đề xuất của người khác
        JsonNode afterDelete = send(delete("/api/v1/proposals/" + cafe), ownerToken, null, 200);
        assertThat(afterDelete.get("proposals")).isEmpty();
        mvc.perform(auth(delete("/api/v1/proposals/" + cafe), ownerToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PROPOSAL_NOT_FOUND"));
    }

    @Test
    void scheduleCreatesItineraryItemOnce() throws Exception {
        Map<String, Object> full = body("Lẩu gà lá é", "OTHER");
        full.put("mapsUrl", "https://maps.app.goo.gl/abc");
        full.put("referenceUrl", "https://www.tiktok.com/@x/video/2");
        full.put("estimatedCost", 200000);
        full.put("note", "Đặt bàn trước");
        long lau = id(send(post("/api/v1/trips/" + tripId + "/proposals"), viewerToken, full, 201), "Lẩu gà lá é");

        // Chưa chốt ngày → 409 NOT_LOCKED
        mvc.perform(auth(post("/api/v1/proposals/" + lau + "/schedule"), editorToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(schedule(1L, "19:00", "FOOD"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOT_LOCKED"));

        lock(2);
        long day2 = dayId(1);

        // VIEWER không đưa vào lịch trình được
        send(post("/api/v1/proposals/" + lau + "/schedule"), viewerToken, schedule(day2, "19:00", "FOOD"), 403);
        // Có giờ kết thúc mà không có giờ bắt đầu → 400
        Map<String, Object> endOnly = schedule(day2, null, "FOOD");
        endOnly.put("endTime", "21:00");
        send(post("/api/v1/proposals/" + lau + "/schedule"), editorToken, endOnly, 400);

        JsonNode scheduled = send(post("/api/v1/proposals/" + lau + "/schedule"), editorToken,
                schedule(day2, "19:00", "FOOD"), 200);
        JsonNode info = scheduled.get("proposals").get(0).get("scheduled");
        assertThat(info.get("dayIndex").asInt()).isEqualTo(2);
        assertThat(info.get("startTime").asText()).isEqualTo("19:00");
        assertThat(info.get("date").isNull()).isFalse();

        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/itinerary"), ownerToken))
                .andExpect(jsonPath("$.days[1].items[0].title").value("Lẩu gà lá é"))
                .andExpect(jsonPath("$.days[1].items[0].category").value("FOOD"))
                .andExpect(jsonPath("$.days[1].items[0].startTime").value("19:00"))
                .andExpect(jsonPath("$.days[1].items[0].mapsUrl").value("https://maps.app.goo.gl/abc"))
                .andExpect(jsonPath("$.days[1].items[0].note").value("Đặt bàn trước"))
                .andExpect(jsonPath("$.days[1].items[0].estimatedCost").value(200000));

        // Lần 2 → 409
        mvc.perform(auth(post("/api/v1/proposals/" + lau + "/schedule"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(schedule(day2, "20:00", "FOOD"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PROPOSAL_ALREADY_SCHEDULED"));

        // Đã lên lịch xếp sau đề xuất chưa lên lịch
        JsonNode list = create(viewerToken, "Chợ đêm", "SHOPPING");
        assertThat(list.get("proposals").get(0).get("title").asText()).isEqualTo("Chợ đêm");
        assertThat(list.get("proposals").get(1).get("id").asLong()).isEqualTo(lau);

        // Ngày của trip khác → 404
        send(post("/api/v1/proposals/" + id(list, "Chợ đêm") + "/schedule"), ownerToken,
                schedule(999_999L, null, "SHOPPING"), 404);
    }

    @Test
    void deletingItemReturnsProposalAndDeletingProposalKeepsItem() throws Exception {
        lock(2);
        long day1 = dayId(0);
        long a = id(create(ownerToken, "A", "FOOD"), "A");
        long b = id(create(ownerToken, "B", "FOOD"), "B");
        long itemA = send(post("/api/v1/proposals/" + a + "/schedule"), ownerToken, schedule(day1, "08:00", "FOOD"), 200)
                .get("proposals").get(1).get("scheduled").get("itemId").asLong();
        send(post("/api/v1/proposals/" + b + "/schedule"), ownerToken, schedule(day1, "12:00", "FOOD"), 200);

        // Xóa hoạt động A → A quay về wishlist (SET NULL), schedule lại được
        mvc.perform(auth(delete("/api/v1/itinerary-items/" + itemA), ownerToken)).andExpect(status().isOk());
        JsonNode list = send(get("/api/v1/trips/" + tripId + "/proposals"), ownerToken, null, 200);
        assertThat(list.get("proposals").get(0).get("id").asLong()).isEqualTo(a);
        assertThat(list.get("proposals").get(0).get("scheduled").isNull()).isTrue();

        // Xóa đề xuất B → hoạt động B vẫn còn
        send(delete("/api/v1/proposals/" + b), ownerToken, null, 200);
        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/itinerary"), ownerToken))
                .andExpect(jsonPath("$.days[0].items.length()").value(1))
                .andExpect(jsonPath("$.days[0].items[0].title").value("B"));
    }

    @Test
    void removedMemberVotesAreDeletedButProposalsKeptAndTripDeletable() throws Exception {
        lock(1);
        long viewerIdea = id(create(viewerToken, "Ý tưởng của Ngọc", "OTHER"), "Ý tưởng của Ngọc");
        send(put("/api/v1/proposals/" + viewerIdea + "/vote"), viewerToken, null, 200);
        send(post("/api/v1/proposals/" + viewerIdea + "/schedule"), ownerToken, schedule(dayId(0), null, "OTHER"), 200);

        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken))
                .andExpect(status().isNoContent());
        JsonNode list = send(get("/api/v1/trips/" + tripId + "/proposals"), ownerToken, null, 200);
        assertThat(list.get("proposals")).hasSize(1);
        assertThat(list.get("proposals").get(0).get("voteCount").asInt()).isZero();
        assertThat(list.get("proposals").get(0).get("canDelete").asBoolean()).isTrue();   // OWNER

        mvc.perform(auth(delete("/api/v1/trips/" + tripId), ownerToken)).andExpect(status().isNoContent());
    }

    // ---------------------------------------------------------------- helpers

    private void lock(int days) throws Exception {
        LocalDate start = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(10);
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/lock-date"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("startDate", start.toString(),
                                "endDate", start.plusDays(days - 1L).toString()))))
                .andExpect(status().isOk());
    }

    private long dayId(int index) throws Exception {
        return send(get("/api/v1/trips/" + tripId + "/itinerary"), ownerToken, null, 200)
                .get("days").get(index).get("id").asLong();
    }

    private JsonNode create(String token, String title, String category) throws Exception {
        return send(post("/api/v1/trips/" + tripId + "/proposals"), token, body(title, category), 201);
    }

    private static Map<String, Object> body(String title, String category) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", title);
        body.put("category", category);
        return body;
    }

    private static Map<String, Object> schedule(Long dayId, String startTime, String category) {
        Map<String, Object> body = new HashMap<>();
        body.put("dayId", dayId);
        body.put("startTime", startTime);
        body.put("category", category);
        return body;
    }

    private static long id(JsonNode list, String title) {
        for (JsonNode p : list.get("proposals")) {
            if (p.get("title").asText().equals(title)) {
                return p.get("id").asLong();
            }
        }
        throw new AssertionError("Không thấy đề xuất " + title);
    }

    private JsonNode send(MockHttpServletRequestBuilder request, String token, Object body, int expected)
            throws Exception {
        MockHttpServletRequestBuilder builder = auth(request, token);
        if (body != null) {
            builder = builder.contentType(MediaType.APPLICATION_JSON).content(json(body));
        }
        String response = mvc.perform(builder).andExpect(status().is(expected)).andReturn().getResponse()
                .getContentAsString();
        return response.isEmpty() ? null : read(response);
    }
}
