package com.tripplanner.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.support.IntegrationTest;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class TripIntegrationTest extends IntegrationTest {

    private String ownerToken;
    private long ownerId;

    @BeforeEach
    void setUp() throws Exception {
        ownerToken = register("linh", "Linh");
        ownerId = userId(ownerToken);
    }

    @Test
    void createTripMakesCreatorOwnerAndShowsOnDashboard() throws Exception {
        JsonNode trip = createTrip(ownerToken, "Đà Lạt mùa hoa", "2027-03-10", "2027-03-12");

        assertThat(trip.get("myRole").asText()).isEqualTo("OWNER");
        assertThat(trip.get("status").asText()).isEqualTo("PLANNING");
        assertThat(trip.get("inviteCode").asText()).hasSize(8);
        assertThat(trip.get("members")).hasSize(1);

        mvc.perform(auth(get("/api/v1/trips"), ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Đà Lạt mùa hoa"))
                .andExpect(jsonPath("$[0].memberCount").value(1))
                .andExpect(jsonPath("$[0].previewMembers[0].displayName").value("Linh"))
                .andExpect(jsonPath("$[0].plannedStartDate").value("2027-03-10"));
    }

    @Test
    void invalidDateRangeIsRejected() throws Exception {
        mvc.perform(auth(post("/api/v1/trips"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(tripBody("Sai ngày", "2027-03-12", "2027-03-10"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE_RANGE"));

        mvc.perform(auth(post("/api/v1/trips"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(tripBody("Thiếu ngày", "2027-03-12", null))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE_RANGE"));
    }

    @Test
    void inviteJoinAndPermissionFlow() throws Exception {
        JsonNode trip = createTrip(ownerToken, "Phú Quốc", null, null);
        long tripId = trip.get("id").asLong();
        String code = trip.get("inviteCode").asText();

        // Xem trước public, mã không phân biệt hoa thường
        mvc.perform(get("/api/v1/trips/invite/" + code.toLowerCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Phú Quốc"))
                .andExpect(jsonPath("$.memberCount").value(1));

        String memberToken = register("mai", "Mai");
        long memberId = userId(memberToken);

        // Join → EDITOR, join lại idempotent
        mvc.perform(auth(post("/api/v1/trips/join/" + code), memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("EDITOR"))
                .andExpect(jsonPath("$.alreadyMember").value(false));
        mvc.perform(auth(post("/api/v1/trips/join/" + code), memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alreadyMember").value(true));

        // EDITOR thấy mã mời, sửa được trip, nhưng không đổi quyền được
        mvc.perform(auth(get("/api/v1/trips/" + tripId), memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inviteCode").value(code))
                .andExpect(jsonPath("$.members", hasSize(2)));
        mvc.perform(auth(patch("/api/v1/trips/" + tripId), memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(tripBody("Phú Quốc 2027", null, null))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Phú Quốc 2027"));
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/members/" + ownerId), memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("role", "VIEWER"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        // OWNER hạ xuống VIEWER → không thấy mã mời, không sửa được
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/members/" + memberId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("role", "VIEWER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("VIEWER"));
        mvc.perform(auth(get("/api/v1/trips/" + tripId), memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inviteCode").value(nullValue()));
        mvc.perform(auth(patch("/api/v1/trips/" + tripId), memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(tripBody("Hack", null, null))))
                .andExpect(status().isForbidden());

        // Không phải thành viên
        String strangerToken = register("nguoila", "Người lạ");
        mvc.perform(auth(get("/api/v1/trips/" + tripId), strangerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_TRIP_MEMBER"));
    }

    @Test
    void ownerRulesTransferAndLeave() throws Exception {
        JsonNode trip = createTrip(ownerToken, "Sa Pa", null, null);
        long tripId = trip.get("id").asLong();
        String memberToken = register("mai", "Mai");
        long memberId = userId(memberToken);
        mvc.perform(auth(post("/api/v1/trips/join/" + trip.get("inviteCode").asText()), memberToken))
                .andExpect(status().isOk());

        // Không gán OWNER qua đổi quyền, không đổi quyền chính OWNER
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/members/" + memberId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("role", "OWNER"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ROLE"));
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/members/" + ownerId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("role", "EDITOR"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CANNOT_CHANGE_OWNER_ROLE"));

        // OWNER không rời được khi chưa chuyển quyền
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + ownerId), ownerToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OWNER_CANNOT_LEAVE"));

        // Chuyển quyền: Mai thành OWNER, Linh thành EDITOR
        mvc.perform(auth(post("/api/v1/trips/" + tripId + "/transfer-ownership"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("userId", memberId))))
                .andExpect(status().isNoContent());
        mvc.perform(auth(get("/api/v1/trips/" + tripId), ownerToken))
                .andExpect(jsonPath("$.myRole").value("EDITOR"));
        mvc.perform(auth(get("/api/v1/trips/" + tripId), memberToken))
                .andExpect(jsonPath("$.myRole").value("OWNER"));

        // Linh tự rời nhóm
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + ownerId), ownerToken))
                .andExpect(status().isNoContent());
        mvc.perform(auth(get("/api/v1/trips/" + tripId), ownerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void regenerateInviteCodeInvalidatesOldCode() throws Exception {
        JsonNode trip = createTrip(ownerToken, "Hội An", null, null);
        long tripId = trip.get("id").asLong();
        String oldCode = trip.get("inviteCode").asText();

        String body = mvc.perform(auth(post("/api/v1/trips/" + tripId + "/invite-code/regenerate"), ownerToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String newCode = read(body).get("inviteCode").asText();
        assertThat(newCode).isNotEqualTo(oldCode);

        mvc.perform(get("/api/v1/trips/invite/" + oldCode))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("INVITE_NOT_FOUND"));
        mvc.perform(get("/api/v1/trips/invite/" + newCode))
                .andExpect(status().isOk());
    }

    @Test
    void onlyOwnerCanDeleteTrip() throws Exception {
        JsonNode trip = createTrip(ownerToken, "Nha Trang", null, null);
        long tripId = trip.get("id").asLong();
        String memberToken = register("mai", "Mai");
        mvc.perform(auth(post("/api/v1/trips/join/" + trip.get("inviteCode").asText()), memberToken))
                .andExpect(status().isOk());

        mvc.perform(auth(delete("/api/v1/trips/" + tripId), memberToken))
                .andExpect(status().isForbidden());
        mvc.perform(auth(delete("/api/v1/trips/" + tripId), ownerToken))
                .andExpect(status().isNoContent());
        mvc.perform(auth(get("/api/v1/trips/" + tripId), ownerToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_NOT_FOUND"));
        mvc.perform(auth(get("/api/v1/trips"), memberToken))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    private JsonNode createTrip(String token, String title, String start, String end) throws Exception {
        String body = mvc.perform(auth(post("/api/v1/trips"), token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(tripBody(title, start, end))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return read(body);
    }

    private static Map<String, Object> tripBody(String title, String start, String end) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", title);
        body.put("destination", "Việt Nam");
        body.put("coverImageUrl", "https://images.example/cover.jpg");
        body.put("plannedStartDate", start);
        body.put("plannedEndDate", end);
        return body;
    }
}
