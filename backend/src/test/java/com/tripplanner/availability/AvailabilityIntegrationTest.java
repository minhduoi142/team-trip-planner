package com.tripplanner.availability;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
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

class AvailabilityIntegrationTest extends IntegrationTest {

    /** Khoảng dự kiến 6 ngày bắt đầu sau 10 ngày nữa (giờ VN) để không dính ngày quá khứ. */
    private final LocalDate start = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(10);
    private final LocalDate end = start.plusDays(5);

    private String ownerToken;
    private String editorToken;
    private String viewerToken;
    private long tripId;
    private long editorId;

    @BeforeEach
    void setUp() throws Exception {
        ownerToken = register("linh", "Linh");
        editorToken = register("mai", "Mai");
        viewerToken = register("ngoc", "Ngọc");
        editorId = userId(editorToken);
        long viewerId = userId(viewerToken);

        JsonNode trip = createTrip(start, end);
        tripId = trip.get("id").asLong();
        String code = trip.get("inviteCode").asText();
        mvc.perform(auth(post("/api/v1/trips/join/" + code), editorToken)).andExpect(status().isOk());
        mvc.perform(auth(post("/api/v1/trips/join/" + code), viewerToken)).andExpect(status().isOk());
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("role", "VIEWER"))))
                .andExpect(status().isOk());
    }

    @Test
    void updateAndReadMatrixWithSuggestions() throws Exception {
        // Cửa sổ 2–4: linh, ngọc rảnh trọn; mai "có thể" (ngày 4) → 5 điểm, cao nhất
        putMine(ownerToken, "BAAAAB");
        putMine(editorToken, "AAAAMB");
        putMine(viewerToken, "..AAA.");

        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/availabilities"), ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rangeStart").value(start.toString()))
                .andExpect(jsonPath("$.rangeEnd").value(end.toString()))
                .andExpect(jsonPath("$.effectiveLengthDays").value(3))
                .andExpect(jsonPath("$.locked").value(false))
                .andExpect(jsonPath("$.members", hasSize(3)))
                .andExpect(jsonPath("$.days", hasSize(6)))
                .andExpect(jsonPath("$.days[2].available").value(3))
                .andExpect(jsonPath("$.days[0].unknown").value(1))
                .andExpect(jsonPath("$.suggestions[0].startDate").value(start.plusDays(2).toString()))
                .andExpect(jsonPath("$.suggestions[0].availableCount").value(2))
                .andExpect(jsonPath("$.suggestions[0].maybeCount").value(1))
                .andExpect(jsonPath("$.suggestions[0].totalMembers").value(3))
                .andExpect(jsonPath("$.suggestionNote").value(nullValue()));
    }

    @Test
    void nullStatusClearsDay() throws Exception {
        putMine(ownerToken, "AAAAAA");
        Map<String, Object> clear = new HashMap<>();
        clear.put("date", start.toString());
        clear.put("status", null);
        mvc.perform(auth(put("/api/v1/trips/" + tripId + "/availabilities"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entries", List.of(clear)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries", hasSize(5)))
                .andExpect(jsonPath("$.members[0].respondedDays").value(5));
    }

    @Test
    void rejectsDatesOutsideRange() throws Exception {
        mvc.perform(auth(put("/api/v1/trips/" + tripId + "/availabilities"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entries", List.of(
                                Map.of("date", end.plusDays(1).toString(), "status", "AVAILABLE"))))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("DATE_OUT_OF_RANGE"));
    }

    @Test
    void tripWithoutPlannedRange() throws Exception {
        long noRangeTrip = createTrip(null, null).get("id").asLong();
        mvc.perform(auth(get("/api/v1/trips/" + noRangeTrip + "/availabilities"), ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rangeStart").value(nullValue()))
                .andExpect(jsonPath("$.suggestionNote").value("NO_RANGE"));
        mvc.perform(auth(put("/api/v1/trips/" + noRangeTrip + "/availabilities"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entries", List.of(
                                Map.of("date", start.toString(), "status", "AVAILABLE"))))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NO_PLANNED_RANGE"));
    }

    @Test
    void plannedRangeLongerThan62DaysIsRejected() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Dài quá");
        body.put("plannedStartDate", start.toString());
        body.put("plannedEndDate", start.plusDays(62).toString());
        mvc.perform(auth(post("/api/v1/trips"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE_RANGE"));
    }

    @Test
    void tripLengthPermissionsAndValidation() throws Exception {
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/trip-length"), editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("days", 2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripLengthDays").value(2))
                .andExpect(jsonPath("$.effectiveLengthDays").value(2));
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/trip-length"), viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("days", 3))))
                .andExpect(status().isForbidden());
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/trip-length"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("days", 15))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TRIP_LENGTH"));
    }

    @Test
    void lockGeneratesTripDaysAndUnlockKeepsAvailability() throws Exception {
        putMine(ownerToken, "AAAAAA");

        // Chỉ OWNER chốt được
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/lock-date"), editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(lockBody(start.plusDays(1), start.plusDays(3)))))
                .andExpect(status().isForbidden());

        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/lock-date"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(lockBody(start.plusDays(1), start.plusDays(3)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UPCOMING"))
                .andExpect(jsonPath("$.startDate").value(start.plusDays(1).toString()))
                .andExpect(jsonPath("$.endDate").value(start.plusDays(3).toString()));

        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/days"), viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].dayIndex").value(1))
                .andExpect(jsonPath("$[0].date").value(start.plusDays(1).toString()))
                .andExpect(jsonPath("$[2].dayIndex").value(3));

        // Đã chốt: không sửa lịch rảnh, không chốt lần nữa, matrix báo LOCKED
        putMineExpect(editorToken, "AAAAAA", 409, "AVAILABILITY_LOCKED");
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/lock-date"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(lockBody(start, start))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_LOCKED"));
        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/availabilities"), ownerToken))
                .andExpect(jsonPath("$.locked").value(true))
                .andExpect(jsonPath("$.suggestionNote").value("LOCKED"));

        // Mở lại (Phase 3): GIỮ "Ngày 1..N" nhưng chưa có ngày thực; giữ lịch rảnh
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/lock-date"), ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PLANNING"))
                .andExpect(jsonPath("$.startDate").value(nullValue()));
        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/days"), ownerToken))
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].date").value(nullValue()))
                .andExpect(jsonPath("$[0].overflow").value(false));
        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/availabilities"), ownerToken))
                .andExpect(jsonPath("$.entries", hasSize(6)));
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/lock-date"), ownerToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOT_LOCKED"));
    }

    @Test
    void lockValidation() throws Exception {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/lock-date"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(lockBody(today.minusDays(1), today.plusDays(1)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE_RANGE"));
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/lock-date"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(lockBody(start, start.plusDays(30)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE_RANGE"));
    }

    @Test
    void removedMemberAvailabilityIsDeletedAndTripDeleteCascades() throws Exception {
        putMine(editorToken, "AAAAAA");
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + editorId), ownerToken))
                .andExpect(status().isNoContent());
        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/availabilities"), ownerToken))
                .andExpect(jsonPath("$.entries", hasSize(0)))
                .andExpect(jsonPath("$.members", hasSize(2)));

        // Xóa trip đã chốt, có lịch rảnh: không lỗi khóa ngoại
        putMine(ownerToken, "AAAAAA");
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/lock-date"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(lockBody(start, start.plusDays(2)))))
                .andExpect(status().isOk());
        mvc.perform(auth(delete("/api/v1/trips/" + tripId), ownerToken))
                .andExpect(status().isNoContent());
    }

    // ---------------------------------------------------------------- helpers

    private JsonNode createTrip(LocalDate from, LocalDate to) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Đà Lạt");
        body.put("plannedStartDate", from == null ? null : from.toString());
        body.put("plannedEndDate", to == null ? null : to.toString());
        String response = mvc.perform(auth(post("/api/v1/trips"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return read(response);
    }

    /** Chuỗi lịch từ ngày {@code start}: A/M/B, '.' = không gửi. */
    private void putMine(String token, String pattern) throws Exception {
        mvc.perform(auth(put("/api/v1/trips/" + tripId + "/availabilities"), token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entries", entries(pattern)))))
                .andExpect(status().isOk());
    }

    private void putMineExpect(String token, String pattern, int httpStatus, String code) throws Exception {
        mvc.perform(auth(put("/api/v1/trips/" + tripId + "/availabilities"), token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entries", entries(pattern)))))
                .andExpect(status().is(httpStatus))
                .andExpect(jsonPath("$.code").value(code));
    }

    private List<Map<String, Object>> entries(String pattern) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (int i = 0; i < pattern.length(); i++) {
            String status = switch (pattern.charAt(i)) {
                case 'A' -> "AVAILABLE";
                case 'M' -> "MAYBE";
                case 'B' -> "BUSY";
                default -> null;
            };
            if (status != null) {
                list.add(Map.of("date", start.plusDays(i).toString(), "status", status));
            }
        }
        return list;
    }

    private static Map<String, Object> lockBody(LocalDate from, LocalDate to) {
        return Map.of("startDate", from.toString(), "endDate", to.toString());
    }
}
