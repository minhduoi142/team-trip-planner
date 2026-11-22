package com.tripplanner.checklist;

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

class ChecklistIntegrationTest extends IntegrationTest {

    private String ownerToken;
    private String editorToken;
    private String viewerToken;
    private long tripId;
    private long editorId;
    private long viewerId;

    @BeforeEach
    void setUp() throws Exception {
        ownerToken = register("linh", "Linh");
        editorToken = register("mai", "Mai");
        viewerToken = register("ngoc", "Ngọc");
        editorId = userId(editorToken);
        viewerId = userId(viewerToken);
        String created = mvc.perform(auth(post("/api/v1/trips"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", "Đà Lạt"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        JsonNode trip = read(created);
        tripId = trip.get("id").asLong();
        String code = trip.get("inviteCode").asText();
        mvc.perform(auth(post("/api/v1/trips/join/" + code), editorToken)).andExpect(status().isOk());
        mvc.perform(auth(post("/api/v1/trips/join/" + code), viewerToken)).andExpect(status().isOk());
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("role", "VIEWER"))))
                .andExpect(status().isOk());
    }

    @Test
    void createAssignAndStatsSortedByCategory() throws Exception {
        create("Chân máy", "PHOTO", editorId);
        JsonNode list = create("Loa bluetooth", "SHARED", null);
        assertThat(list.get("total").asInt()).isEqualTo(2);
        assertThat(list.get("unassigned").asInt()).isEqualTo(1);
        // SHARED đứng trước PHOTO theo thứ tự nhóm
        assertThat(list.get("items").get(0).get("itemName").asText()).isEqualTo("Loa bluetooth");
        assertThat(list.get("items").get(1).get("assignee").get("displayName").asText()).isEqualTo("Mai");
        assertThat(list.get("items").get(1).get("quantity").asInt()).isEqualTo(1);
    }

    @Test
    void assigneeMustBeMember() throws Exception {
        long strangerId = userId(register("nguoila", "Người lạ"));
        mvc.perform(auth(post("/api/v1/trips/" + tripId + "/checklist"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(body("X", "OTHER", strangerId))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ASSIGNEE_NOT_MEMBER"));
    }

    @Test
    void viewerCanClaimAndCheckOwnItemButNotCreate() throws Exception {
        long itemId = firstId(create("Thuốc say xe", "MEDICAL", null));

        mvc.perform(auth(post("/api/v1/trips/" + tripId + "/checklist"), viewerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(body("X", "OTHER", null))))
                .andExpect(status().isForbidden());

        mvc.perform(auth(post("/api/v1/checklist-items/" + itemId + "/claim"), viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].assignee.userId").value(viewerId));
        // Đã có người nhận → người khác nhận bị 409
        mvc.perform(auth(post("/api/v1/checklist-items/" + itemId + "/claim"), editorToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_CLAIMED"));

        mvc.perform(auth(patch("/api/v1/checklist-items/" + itemId + "/check"), viewerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("checked", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.checked").value(1));

        // Bỏ nhận → về chưa ai nhận và bỏ tick
        mvc.perform(auth(delete("/api/v1/checklist-items/" + itemId + "/claim"), viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unassigned").value(1))
                .andExpect(jsonPath("$.checked").value(0));
    }

    @Test
    void onlyAssigneeOrEditorCanCheck() throws Exception {
        long itemId = firstId(create("Sạc dự phòng", "ELECTRONICS", editorId));
        mvc.perform(auth(patch("/api/v1/checklist-items/" + itemId + "/check"), viewerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("checked", true))))
                .andExpect(status().isForbidden());
        mvc.perform(auth(patch("/api/v1/checklist-items/" + itemId + "/check"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("checked", true))))
                .andExpect(status().isOk());
        // Đổi người mang → tick bị reset
        mvc.perform(auth(put("/api/v1/checklist-items/" + itemId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(body("Sạc dự phòng", "ELECTRONICS", viewerId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].checked").value(false));
    }

    @Test
    void removingMemberUnassignsTheirItems() throws Exception {
        long itemId = firstId(create("Loa", "SHARED", editorId));
        mvc.perform(auth(patch("/api/v1/checklist-items/" + itemId + "/check"), editorToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("checked", true))))
                .andExpect(status().isOk());
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + editorId), ownerToken))
                .andExpect(status().isNoContent());
        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/checklist"), ownerToken))
                .andExpect(jsonPath("$.unassigned").value(1))
                .andExpect(jsonPath("$.checked").value(0));
    }

    @Test
    void deleteItemAndDeleteTripWithAssignedChecklist() throws Exception {
        long itemId = firstId(create("Bạt", "SHARED", editorId));
        create("Áo khoác", "OTHER", viewerId);
        mvc.perform(auth(delete("/api/v1/checklist-items/" + itemId), ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1));
        mvc.perform(auth(delete("/api/v1/trips/" + tripId), ownerToken)).andExpect(status().isNoContent());
    }

    private JsonNode create(String name, String category, Long assigneeId) throws Exception {
        return read(mvc.perform(auth(post("/api/v1/trips/" + tripId + "/checklist"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(body(name, category, assigneeId))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }

    private static Map<String, Object> body(String name, String category, Long assigneeId) {
        Map<String, Object> body = new HashMap<>();
        body.put("itemName", name);
        body.put("category", category);
        body.put("assigneeId", assigneeId);
        return body;
    }

    private static long firstId(JsonNode list) {
        return list.get("items").get(0).get("id").asLong();
    }
}
