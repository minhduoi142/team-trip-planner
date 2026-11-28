package com.tripplanner.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.media.StorageService;
import com.tripplanner.media.StorageService.StoredObject;
import com.tripplanner.support.IntegrationTest;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Ví giấy tờ (docs/sdd-trip-documents.md). linh OWNER, mai EDITOR, ngọc VIEWER. Kho file là mock. */
class DocumentIntegrationTest extends IntegrationTest {

    private static final byte[] PDF = "%PDF-1.7\nfake ticket".getBytes(StandardCharsets.US_ASCII);

    @MockitoBean
    private StorageService storage;

    private String linhToken;
    private String maiToken;
    private String ngocToken;
    private long tripId;
    private long ngoc;

    @BeforeEach
    void setUp() throws Exception {
        linhToken = register("linh", "Linh");
        maiToken = register("mai", "Mai");
        ngocToken = register("ngoc", "Ngọc");
        ngoc = userId(ngocToken);
        JsonNode trip = send(post("/api/v1/trips"), linhToken, Map.of("title", "Phú Quốc"), 201);
        tripId = trip.get("id").asLong();
        String code = trip.get("inviteCode").asText();
        send(post("/api/v1/trips/join/" + code), maiToken, null, 200);
        send(post("/api/v1/trips/join/" + code), ngocToken, null, 200);
        send(patch("/api/v1/trips/" + tripId + "/members/" + ngoc), linhToken, Map.of("role", "VIEWER"), 200);
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

    private static Map<String, Object> doc(String kind, String title, String visibility) {
        Map<String, Object> body = new HashMap<>();
        body.put("kind", kind);
        body.put("title", title);
        body.put("visibility", visibility);
        return body;
    }

    private JsonNode create(String token, Map<String, Object> body, int expected) throws Exception {
        return send(post("/api/v1/trips/" + tripId + "/documents"), token, body, expected);
    }

    private static long idOf(JsonNode list, String title) {
        for (JsonNode d : list.get("documents")) {
            if (d.get("title").asText().equals(title)) {
                return d.get("id").asLong();
            }
        }
        throw new AssertionError("không có " + title);
    }

    private org.springframework.test.web.servlet.ResultActions upload(String token, long id, byte[] bytes,
                                                                       String name) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", name, "application/octet-stream", bytes);
        return mvc.perform(auth(multipart(HttpMethod.PUT, "/api/v1/documents/" + id + "/file").file(file), token));
    }

    @Test
    void sharedDocumentsWithTimesAndOrdering() throws Exception {
        Map<String, Object> flight = doc("FLIGHT", "Bay HCM → Phú Quốc", "SHARED");
        flight.put("bookingCode", " ABC123 ");
        flight.put("startsAt", "2026-12-04T08:00");
        flight.put("endsAt", "2026-12-04T09:05");
        flight.put("contactPhone", "+84 909 123 456");
        create(ngocToken, flight, 201);   // VIEWER thêm được
        Map<String, Object> stay = doc("STAY", "Homestay Dương Đông", "SHARED");
        stay.put("startsAt", "2026-12-04T14:00");
        create(maiToken, stay, 201);
        JsonNode list = create(maiToken, doc("OTHER", "Danh sách SĐT khẩn cấp", "SHARED"), 201);

        JsonNode docs = list.get("documents");
        assertThat(docs).hasSize(3);
        assertThat(docs.get(0).get("title").asText()).isEqualTo("Bay HCM → Phú Quốc");   // có giờ trước
        assertThat(docs.get(0).get("bookingCode").asText()).isEqualTo("ABC123");
        assertThat(docs.get(0).get("startsAt").asText()).startsWith("2026-12-04T08:00");
        assertThat(docs.get(2).get("startsAt").isNull()).isTrue();                        // không giờ sau cùng
        // Giờ địa phương lưu nguyên, không bị đổi múi giờ
        assertThat(jdbc.queryForObject("SELECT DATE_FORMAT(starts_at, '%H:%i') FROM trip_documents WHERE kind = 'FLIGHT'",
                String.class)).isEqualTo("08:00");

        // Validation
        Map<String, Object> bad = doc("FLIGHT", "X", "SHARED");
        bad.put("startsAt", "2026-12-04T10:00");
        bad.put("endsAt", "2026-12-04T09:00");
        create(linhToken, bad, 400);
        Map<String, Object> phone = doc("STAY", "X", "SHARED");
        phone.put("contactPhone", "gọi tôi");
        create(linhToken, phone, 400);
        create(linhToken, doc("ALIEN", "X", "SHARED"), 400);
    }

    @Test
    void editRightsForSharedDocuments() throws Exception {
        long id = idOf(create(ngocToken, doc("TICKET", "Vé VinWonders", "SHARED"), 201), "Vé VinWonders");
        JsonNode asMai = send(get("/api/v1/trips/" + tripId + "/documents"), maiToken, null, 200);
        assertThat(asMai.get("documents").get(0).get("canEdit").asBoolean()).isFalse();
        assertThat(asMai.get("documents").get(0).get("createdByName").asText()).isEqualTo("Ngọc");

        send(put("/api/v1/documents/" + id), maiToken, doc("TICKET", "Sửa", "SHARED"), 403);    // EDITOR khác
        send(delete("/api/v1/documents/" + id), maiToken, null, 403);
        JsonNode edited = send(put("/api/v1/documents/" + id), linhToken, doc("TICKET", "Vé VinWonders 2 ngày",
                "SHARED"), 200);   // OWNER sửa được
        assertThat(edited.get("documents").get(0).get("title").asText()).isEqualTo("Vé VinWonders 2 ngày");
        assertThat(send(delete("/api/v1/documents/" + id), ngocToken, null, 200).get("documents")).isEmpty();
    }

    @Test
    void privateDocumentsAreInvisibleEvenToOwner() throws Exception {
        given(storage.getPrivate(anyString())).willReturn(new StoredObject(PDF, "application/pdf"));
        long id = idOf(create(ngocToken, doc("ID", "CCCD của Ngọc", "PRIVATE"), 201), "CCCD của Ngọc");
        upload(ngocToken, id, PDF, "cccd.pdf").andExpect(status().isOk());

        JsonNode asOwner = send(get("/api/v1/trips/" + tripId + "/documents"), linhToken, null, 200);
        assertThat(asOwner.get("documents")).isEmpty();
        mvc.perform(auth(get("/api/v1/documents/" + id + "/file"), linhToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("DOCUMENT_NOT_FOUND"));
        send(put("/api/v1/documents/" + id), linhToken, doc("ID", "x", "SHARED"), 404);
        send(delete("/api/v1/documents/" + id), linhToken, null, 404);
        upload(linhToken, id, PDF, "x.pdf").andExpect(status().isNotFound());

        JsonNode mine = send(get("/api/v1/trips/" + tripId + "/documents"), ngocToken, null, 200);
        assertThat(mine.get("documents").get(0).get("mine").asBoolean()).isTrue();
        assertThat(mine.get("documents").get(0).get("canEdit").asBoolean()).isTrue();

        // Người ngoài chuyến
        String stranger = register("lan", "Lan");
        send(get("/api/v1/trips/" + tripId + "/documents"), stranger, null, 403);
    }

    @Test
    void uploadValidatesTypeAndStreamsBackPrivately() throws Exception {
        given(storage.getPrivate(anyString())).willReturn(new StoredObject(PDF, "application/pdf"));
        long id = idOf(create(maiToken, doc("FLIGHT", "Vé máy bay", "SHARED"), 201), "Vé máy bay");

        upload(maiToken, id, "<html>hi</html>".getBytes(StandardCharsets.UTF_8), "ve.pdf")
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_DOCUMENT_TYPE"));
        upload(maiToken, id, new byte[(int) DocumentService.MAX_BYTES + 1], "big.pdf")
                .andExpect(status().isPayloadTooLarge());
        verify(storage, never()).putPrivate(anyString(), any(), anyString());

        upload(maiToken, id, PDF, "C:\\fakepath\\Vé VJ123.pdf").andExpect(status().isOk())
                .andExpect(jsonPath("$.documents[0].file.type").value("application/pdf"))
                .andExpect(jsonPath("$.documents[0].file.name").value("Vé VJ123.pdf"))
                .andExpect(jsonPath("$.documents[0].file.size").value(PDF.length));
        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(storage).putPrivate(key.capture(), eq(PDF), eq("application/pdf"));
        assertThat(key.getValue()).matches("documents/" + tripId + "/[0-9a-f-]{36}\\.pdf");
        // Không bao giờ dùng bucket công khai cho giấy tờ
        verify(storage, never()).put(anyString(), any(), anyString());

        // Mọi thành viên xem được file của giấy tờ chung, không cache
        mvc.perform(auth(get("/api/v1/documents/" + id + "/file"), ngocToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("filename*=UTF-8''V%C3%A9%20VJ123.pdf")));

        // Thay file → object cũ bị xóa sau commit; bỏ file → object mới bị xóa
        upload(maiToken, id, PDF, "moi.pdf").andExpect(status().isOk());
        verify(storage).deletePrivate(key.getValue());
        JsonNode removed = send(delete("/api/v1/documents/" + id + "/file"), maiToken, null, 200);
        assertThat(removed.get("documents").get(0).get("file").isNull()).isTrue();
        mvc.perform(auth(get("/api/v1/documents/" + id + "/file"), maiToken)).andExpect(status().isNotFound());
    }

    @Test
    void leavingRemovesOnlyPrivateDocumentsAndDeletingTripDeletesFiles() throws Exception {
        long priv = idOf(create(ngocToken, doc("INSURANCE", "Bảo hiểm của Ngọc", "PRIVATE"), 201), "Bảo hiểm của Ngọc");
        upload(ngocToken, priv, PDF, "bh.pdf").andExpect(status().isOk());
        create(ngocToken, doc("STAY", "Homestay", "SHARED"), 201);

        send(delete("/api/v1/trips/" + tripId + "/members/" + ngoc), linhToken, null, 204);
        assertThat(jdbc.queryForList("SELECT title FROM trip_documents", String.class)).containsExactly("Homestay");
        verify(storage).deletePrivate(org.mockito.ArgumentMatchers.startsWith("documents/" + tripId + "/"));

        long shared = idOf(send(get("/api/v1/trips/" + tripId + "/documents"), linhToken, null, 200), "Homestay");
        upload(linhToken, shared, PDF, "hs.pdf").andExpect(status().isOk());
        send(delete("/api/v1/trips/" + tripId), linhToken, null, 204);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trip_documents", Integer.class)).isZero();
        verify(storage, org.mockito.Mockito.times(2))
                .deletePrivate(org.mockito.ArgumentMatchers.startsWith("documents/" + tripId + "/"));
    }
}
