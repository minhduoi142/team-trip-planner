package com.tripplanner.album;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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

/** Phase 5: album link Drive, chia phòng, trang share (Open Graph). */
class AlbumRoomShareIntegrationTest extends IntegrationTest {

    private static final String FILE_A = "1AAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    private static final String FILE_B = "1BBBBBBBBBBBBBBBBBBBBBBBBBBBB";
    private static final String FOLDER = "1FFFFFFFFFFFFFFFFFFFFFFFFFFFF";

    private String ownerToken;
    private String viewerToken;
    private String editorToken;
    private long tripId;
    private long viewerId;
    private long editorId;
    private long ownerId;
    private String inviteCode;

    @BeforeEach
    void setUp() throws Exception {
        ownerToken = register("linh", "Linh");
        editorToken = register("mai", "Mai");
        viewerToken = register("ngoc", "Ngọc");
        ownerId = userId(ownerToken);
        editorId = userId(editorToken);
        viewerId = userId(viewerToken);
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Đà Lạt <script>alert(1)</script>");
        body.put("destination", "Đà Lạt");
        body.put("coverImageUrl", "preset:lavender");
        JsonNode trip = read(mvc.perform(auth(post("/api/v1/trips"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        tripId = trip.get("id").asLong();
        inviteCode = trip.get("inviteCode").asText();
        mvc.perform(auth(post("/api/v1/trips/join/" + inviteCode), editorToken)).andExpect(status().isOk());
        mvc.perform(auth(post("/api/v1/trips/join/" + inviteCode), viewerToken)).andExpect(status().isOk());
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("role", "VIEWER"))))
                .andExpect(status().isOk());
    }

    // ---------------------------------------------------------------- album

    @Test
    void folderLinkMustBeDriveFolderAndOnlyEditors() throws Exception {
        send(put("/api/v1/trips/" + tripId + "/album/folder"), viewerToken,
                Map.of("url", "https://drive.google.com/drive/folders/" + FOLDER), 403);
        mvc.perform(auth(put("/api/v1/trips/" + tripId + "/album/folder"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("url", "https://drive.google.com/file/d/" + FILE_A + "/view"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DRIVE_LINK"));

        JsonNode album = send(put("/api/v1/trips/" + tripId + "/album/folder"), editorToken,
                Map.of("url", "https://drive.google.com/drive/folders/" + FOLDER + "?usp=sharing"), 200);
        assertThat(album.get("folderId").asText()).isEqualTo(FOLDER);
        assertThat(album.get("folderEmbedUrl").asText()).contains("embeddedfolderview?id=" + FOLDER);
        mvc.perform(auth(get("/api/v1/trips/" + tripId), viewerToken))
                .andExpect(jsonPath("$.driveFolderUrl").value(containsString(FOLDER)));

        JsonNode cleared = send(put("/api/v1/trips/" + tripId + "/album/folder"), ownerToken, Map.of("url", ""), 200);
        assertThat(cleared.get("folderUrl").isNull()).isTrue();
    }

    @Test
    void addManyLinksSkippingInvalidAndDuplicatesAndTagDay() throws Exception {
        long dayId = lockAndFirstDay();
        Map<String, Object> body = new HashMap<>();
        body.put("links", List.of(
                "https://drive.google.com/file/d/" + FILE_A + "/view?usp=sharing",
                "https://photos.app.goo.gl/xyz",
                "https://drive.google.com/open?id=" + FILE_A,
                "",
                "https://drive.google.com/uc?id=" + FILE_B + "&export=download"));
        body.put("dayId", dayId);
        body.put("caption", "Săn mây");
        JsonNode added = send(post("/api/v1/trips/" + tripId + "/album/photos"), viewerToken, body, 201);
        assertThat(added.get("added").asInt()).isEqualTo(2);
        assertThat(added.get("skipped")).hasSize(2);
        assertThat(added.get("skipped").get(0).get("reason").asText()).isEqualTo("INVALID");
        assertThat(added.get("skipped").get(1).get("reason").asText()).isEqualTo("DUPLICATE");
        JsonNode photo = added.get("album").get("photos").get(0);
        assertThat(photo.get("dayIndex").asInt()).isEqualTo(1);
        assertThat(photo.get("thumbnailUrl").asText()).startsWith("https://drive.google.com/thumbnail?id=");
        assertThat(photo.get("canEdit").asBoolean()).isTrue();

        // Thêm lại FILE_A lần nữa → bỏ qua do trùng
        JsonNode again = send(post("/api/v1/trips/" + tripId + "/album/photos"), ownerToken,
                Map.of("links", List.of("https://drive.google.com/file/d/" + FILE_A + "/view")), 201);
        assertThat(again.get("added").asInt()).isZero();
    }

    @Test
    void photoPermissionsAndDayFromOtherTrip() throws Exception {
        JsonNode added = send(post("/api/v1/trips/" + tripId + "/album/photos"), editorToken,
                Map.of("links", List.of("https://drive.google.com/file/d/" + FILE_A + "/view")), 201);
        long photoId = added.get("album").get("photos").get(0).get("id").asLong();

        // VIEWER không sửa/xóa ảnh người khác
        send(delete("/api/v1/album-photos/" + photoId), viewerToken, null, 403);

        // Gắn ngày của trip khác → DAY_NOT_FOUND
        long otherTrip = read(mvc.perform(auth(post("/api/v1/trips"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", "Khác"))))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
        LocalDate start = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(5);
        mvc.perform(auth(patch("/api/v1/trips/" + otherTrip + "/lock-date"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("startDate", start.toString(), "endDate", start.toString()))))
                .andExpect(status().isOk());
        long otherDay = read(mvc.perform(auth(get("/api/v1/trips/" + otherTrip + "/days"), ownerToken))
                .andReturn().getResponse().getContentAsString()).get(0).get("id").asLong();
        Map<String, Object> update = new HashMap<>();
        update.put("caption", "x");
        update.put("dayId", otherDay);
        mvc.perform(auth(patch("/api/v1/album-photos/" + photoId), editorToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(update)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("DAY_NOT_FOUND"));

        // Người thêm sửa chú thích + gắn ngày đúng trip, rồi bỏ gắn
        long dayId = lockAndFirstDay();
        update.put("dayId", dayId);
        JsonNode tagged = send(patch("/api/v1/album-photos/" + photoId), editorToken, update, 200);
        assertThat(tagged.get("photos").get(0).get("dayId").asLong()).isEqualTo(dayId);
        update.put("dayId", null);
        JsonNode untagged = send(patch("/api/v1/album-photos/" + photoId), editorToken, update, 200);
        assertThat(untagged.get("photos").get(0).get("dayId").isNull()).isTrue();

        // OWNER xóa được
        JsonNode afterDelete = send(delete("/api/v1/album-photos/" + photoId), ownerToken, null, 200);
        assertThat(afterDelete.get("photos")).isEmpty();
    }

    // ---------------------------------------------------------------- rooms

    @Test
    void roomsAssignMoveCapacityAndPermissions() throws Exception {
        send(post("/api/v1/trips/" + tripId + "/rooms"), viewerToken, Map.of("name", "P1"), 403);
        JsonNode created = send(post("/api/v1/trips/" + tripId + "/rooms"), ownerToken,
                Map.of("name", "Phòng 1", "capacity", 1), 201);
        long room1 = created.get("rooms").get(0).get("id").asLong();
        assertThat(created.get("unassigned")).hasSize(3);
        mvc.perform(auth(post("/api/v1/trips/" + tripId + "/rooms"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("name", "PHÒNG 1"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_ROOM"));
        long room2 = send(post("/api/v1/trips/" + tripId + "/rooms"), ownerToken, Map.of("name", "Phòng 2"), 201)
                .get("rooms").get(1).get("id").asLong();

        // VIEWER tự vào phòng; xếp hộ người khác → 403
        JsonNode in = send(put("/api/v1/rooms/" + room1 + "/members/" + viewerId), viewerToken, null, 200);
        assertThat(in.get("rooms").get(0).get("members").get(0).get("userId").asLong()).isEqualTo(viewerId);
        send(put("/api/v1/rooms/" + room2 + "/members/" + editorId), viewerToken, null, 403);

        // Phòng 1 đầy (sức chứa 1)
        mvc.perform(auth(put("/api/v1/rooms/" + room1 + "/members/" + editorId), ownerToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_FULL"));

        // Vào phòng 2 → tự rời phòng 1 (mỗi người ≤ 1 phòng)
        JsonNode moved = send(put("/api/v1/rooms/" + room2 + "/members/" + viewerId), viewerToken, null, 200);
        assertThat(moved.get("rooms").get(0).get("members")).isEmpty();
        assertThat(moved.get("rooms").get(1).get("members")).hasSize(1);

        // Không giảm sức chứa dưới số người đang ở
        send(put("/api/v1/rooms/" + room2 + "/members/" + editorId), ownerToken, null, 200);
        mvc.perform(auth(put("/api/v1/rooms/" + room2), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("name", "Phòng 2", "capacity", 1))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_FULL"));

        // Xóa thành viên → mất xếp phòng; xóa phòng → người về chưa có phòng
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + viewerId), ownerToken))
                .andExpect(status().isNoContent());
        JsonNode afterRemove = send(get("/api/v1/trips/" + tripId + "/rooms"), ownerToken, null, 200);
        assertThat(afterRemove.get("rooms").get(1).get("members")).hasSize(1);
        JsonNode afterDelete = send(delete("/api/v1/rooms/" + room2), ownerToken, null, 200);
        assertThat(afterDelete.get("rooms")).hasSize(1);
        assertThat(afterDelete.get("unassigned")).hasSize(2);

        // Xóa trip có phòng + album không lỗi
        send(post("/api/v1/trips/" + tripId + "/album/photos"), ownerToken,
                Map.of("links", List.of("https://drive.google.com/file/d/" + FILE_A + "/view")), 201);
        mvc.perform(auth(delete("/api/v1/trips/" + tripId), ownerToken)).andExpect(status().isNoContent());
        assertThat(ownerId).isPositive();
    }

    // ---------------------------------------------------------------- share

    @Test
    void sharePageHasEscapedOpenGraphAndRedirect() throws Exception {
        mvc.perform(get("/share/" + inviteCode.toLowerCase()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(containsString("<meta property=\"og:title\" content=\"Đà Lạt &lt;script&gt;")))
                .andExpect(content().string(not(containsString("<script>alert(1)"))))
                .andExpect(content().string(containsString("og:image\" content=\"http://localhost:8080/share/" + inviteCode + "/cover.png")))
                .andExpect(content().string(containsString("Cùng 3 người lên kế hoạch")))
                .andExpect(content().string(containsString("http://localhost:5173/join/" + inviteCode)));

        mvc.perform(get("/share/KHONGTONTAI")).andExpect(status().isNotFound());
    }

    @Test
    void coverPngForPresetAndRedirectForUrl() throws Exception {
        mvc.perform(get("/share/" + inviteCode + "/cover.png"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG));

        Map<String, Object> body = new HashMap<>();
        body.put("title", "Có ảnh bìa");
        body.put("coverImageUrl", "https://images.example/cover.jpg");
        String code = read(mvc.perform(auth(post("/api/v1/trips"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andReturn().getResponse().getContentAsString()).get("inviteCode").asText();
        mvc.perform(get("/share/" + code + "/cover.png"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://images.example/cover.jpg"));
    }

    // ---------------------------------------------------------------- helpers

    private long lockAndFirstDay() throws Exception {
        JsonNode days = read(mvc.perform(auth(get("/api/v1/trips/" + tripId + "/days"), ownerToken))
                .andReturn().getResponse().getContentAsString());
        if (days.isEmpty()) {
            LocalDate start = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(10);
            mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/lock-date"), ownerToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("startDate", start.toString(), "endDate", start.plusDays(1).toString()))))
                    .andExpect(status().isOk());
            days = read(mvc.perform(auth(get("/api/v1/trips/" + tripId + "/days"), ownerToken))
                    .andReturn().getResponse().getContentAsString());
        }
        return days.get(0).get("id").asLong();
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
