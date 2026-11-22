package com.tripplanner.poll;

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

class PollIntegrationTest extends IntegrationTest {

    private String ownerToken;
    private String viewerToken;
    private long tripId;
    private long viewerId;

    @BeforeEach
    void setUp() throws Exception {
        ownerToken = register("linh", "Linh");
        viewerToken = register("ngoc", "Ngọc");
        viewerId = userId(viewerToken);
        JsonNode trip = read(mvc.perform(auth(post("/api/v1/trips"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", "Đà Lạt"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        tripId = trip.get("id").asLong();
        mvc.perform(auth(post("/api/v1/trips/join/" + trip.get("inviteCode").asText()), viewerToken))
                .andExpect(status().isOk());
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("role", "VIEWER"))))
                .andExpect(status().isOk());
    }

    @Test
    void createVoteAndAddOptionsAsViewer() throws Exception {
        JsonNode created = createPoll("Tối ăn gì?", "Lẩu gà", "Bánh căn");
        JsonNode poll = created.get("polls").get(0);
        long pollId = poll.get("id").asLong();
        long lau = poll.get("options").get(0).get("id").asLong();
        assertThat(poll.get("closed").asBoolean()).isFalse();

        // VIEWER không tạo được bình chọn nhưng thêm lựa chọn + vote được
        send(post("/api/v1/trips/" + tripId + "/polls"), viewerToken, Map.of("title", "X"), 403);
        JsonNode added = send(post("/api/v1/polls/" + pollId + "/options"), viewerToken,
                Map.of("name", "Nướng ngói"), 201);
        assertThat(added.get("polls").get(0).get("options")).hasSize(3);
        assertThat(added.get("polls").get(0).get("options").get(2).get("canDelete").asBoolean()).isTrue();

        // Trùng tên (không phân biệt dấu/hoa thường) → 409
        mvc.perform(auth(post("/api/v1/polls/" + pollId + "/options"), viewerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("name", "LAU GA"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_OPTION"));

        // Vote idempotent, chọn nhiều
        send(put("/api/v1/poll-options/" + lau + "/vote"), viewerToken, null, 200);
        send(put("/api/v1/poll-options/" + lau + "/vote"), viewerToken, null, 200);
        JsonNode voted = send(put("/api/v1/poll-options/" + lau + "/vote"), ownerToken, null, 200);
        JsonNode lauOption = voted.get("polls").get(0).get("options").get(0);
        assertThat(lauOption.get("voteCount").asInt()).isEqualTo(2);
        assertThat(lauOption.get("votedByMe").asBoolean()).isTrue();

        JsonNode unvoted = send(delete("/api/v1/poll-options/" + lau + "/vote"), viewerToken, null, 200);
        assertThat(unvoted.get("polls").get(0).get("options").get(0).get("voteCount").asInt()).isEqualTo(1);
        assertThat(unvoted.get("polls").get(0).get("canManage").asBoolean()).isFalse();
    }

    @Test
    void closeAddsToItineraryAndBlocksChanges() throws Exception {
        LocalDate start = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(10);
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/lock-date"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("startDate", start.toString(), "endDate", start.plusDays(1).toString()))))
                .andExpect(status().isOk());
        JsonNode itinerary = read(mvc.perform(auth(get("/api/v1/trips/" + tripId + "/itinerary"), ownerToken))
                .andReturn().getResponse().getContentAsString());
        long day2 = itinerary.get("days").get(1).get("id").asLong();

        JsonNode poll = createPoll("Tối ngày 2?", "Lẩu gà", "Bánh căn").get("polls").get(0);
        long pollId = poll.get("id").asLong();
        long banhCan = poll.get("options").get(1).get("id").asLong();

        // VIEWER không chốt được
        send(post("/api/v1/polls/" + pollId + "/close"), viewerToken, Map.of("optionId", banhCan), 403);

        Map<String, Object> add = new HashMap<>();
        add.put("dayId", day2);
        add.put("startTime", "19:00");
        add.put("category", "FOOD");
        JsonNode closed = send(post("/api/v1/polls/" + pollId + "/close"), ownerToken,
                Map.of("optionId", banhCan, "addToItinerary", add), 200);
        assertThat(closed.get("polls").get(0).get("closed").asBoolean()).isTrue();
        assertThat(closed.get("polls").get(0).get("winningOptionId").asLong()).isEqualTo(banhCan);

        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/itinerary"), ownerToken))
                .andExpect(jsonPath("$.days[1].items[0].title").value("Bánh căn"))
                .andExpect(jsonPath("$.days[1].items[0].startTime").value("19:00"))
                .andExpect(jsonPath("$.days[1].items[0].category").value("FOOD"));

        // Đã chốt → không vote / thêm lựa chọn
        mvc.perform(auth(put("/api/v1/poll-options/" + banhCan + "/vote"), viewerToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("POLL_CLOSED"));

        // Mở lại → vote được, hoạt động trong lịch trình vẫn giữ
        JsonNode reopened = send(post("/api/v1/polls/" + pollId + "/reopen"), ownerToken, null, 200);
        assertThat(reopened.get("polls").get(0).get("winningOptionId").isNull()).isTrue();
        send(put("/api/v1/poll-options/" + banhCan + "/vote"), viewerToken, null, 200);
    }

    @Test
    void removedMemberVotesAreDeletedAndPollCanBeDeleted() throws Exception {
        JsonNode poll = createPoll("Đi đâu?", "Đồi chè").get("polls").get(0);
        long option = poll.get("options").get(0).get("id").asLong();
        send(put("/api/v1/poll-options/" + option + "/vote"), viewerToken, null, 200);

        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken))
                .andExpect(status().isNoContent());
        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/polls"), ownerToken))
                .andExpect(jsonPath("$.polls[0].options[0].voteCount").value(0));

        // Bình chọn đã chốt (winning_option_id trỏ vào option) vẫn xóa được, và xóa cả trip được
        send(post("/api/v1/polls/" + poll.get("id").asLong() + "/close"), ownerToken, Map.of("optionId", option), 200);
        JsonNode afterDelete = send(delete("/api/v1/polls/" + poll.get("id").asLong()), ownerToken, null, 200);
        assertThat(afterDelete.get("polls")).isEmpty();
        createPoll("Còn lại", "A", "B");
        mvc.perform(auth(delete("/api/v1/trips/" + tripId), ownerToken)).andExpect(status().isNoContent());
    }

    private JsonNode createPoll(String title, String... options) throws Exception {
        return send(post("/api/v1/trips/" + tripId + "/polls"), ownerToken,
                Map.of("title", title, "options", List.of(options).stream().map(n -> Map.of("name", n)).toList()), 201);
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
