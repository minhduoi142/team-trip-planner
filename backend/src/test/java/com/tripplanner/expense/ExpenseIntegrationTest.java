package com.tripplanner.expense;

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
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class ExpenseIntegrationTest extends IntegrationTest {

    private String linhToken; // OWNER
    private String maiToken;  // EDITOR
    private String ngocToken; // VIEWER
    private long tripId;
    private long linh;
    private long mai;
    private long ngoc;

    @BeforeEach
    void setUp() throws Exception {
        linhToken = register("linh", "Linh");
        maiToken = register("mai", "Mai");
        ngocToken = register("ngoc", "Ngọc");
        linh = userId(linhToken);
        mai = userId(maiToken);
        ngoc = userId(ngocToken);
        JsonNode trip = read(mvc.perform(auth(post("/api/v1/trips"), linhToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", "Phú Quốc"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        tripId = trip.get("id").asLong();
        String code = trip.get("inviteCode").asText();
        mvc.perform(auth(post("/api/v1/trips/join/" + code), maiToken)).andExpect(status().isOk());
        mvc.perform(auth(post("/api/v1/trips/join/" + code), ngocToken)).andExpect(status().isOk());
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/members/" + ngoc), linhToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("role", "VIEWER"))))
                .andExpect(status().isOk());
    }

    @Test
    void equalSplitBalancesAndSuggestions() throws Exception {
        // Linh trả 300.001đ chia 3 → Linh 100.001, Mai 100.000, Ngọc 100.000
        JsonNode summary = send(post("/api/v1/trips/" + tripId + "/expenses"), linhToken,
                equal("Homestay", 300_001, linh, List.of(linh, mai, ngoc)), 201);
        assertThat(summary.get("totalAmount").asLong()).isEqualTo(300_001);
        JsonNode shares = summary.get("expenses").get(0).get("shares");
        assertThat(shares.get(0).get("amount").asLong()).isEqualTo(100_001); // userId nhỏ nhất = linh
        assertThat(member(summary, linh).get("net").asLong()).isEqualTo(200_000);
        assertThat(member(summary, ngoc).get("net").asLong()).isEqualTo(-100_000);
        assertThat(summary.get("transfers")).hasSize(2);
        assertThat(summary.get("byCategory").get(0).get("category").asText()).isEqualTo("STAY");
    }

    @Test
    void customSplitMustMatchTotal() throws Exception {
        Map<String, Object> body = base("Hải sản", 1_000_000, linh);
        body.put("splitMode", "CUSTOM");
        body.put("shares", List.of(Map.of("userId", linh, "amount", 300_000), Map.of("userId", mai, "amount", 600_000)));
        mvc.perform(auth(post("/api/v1/trips/" + tripId + "/expenses"), linhToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SPLIT"));

        body.put("shares", List.of(Map.of("userId", linh, "amount", 400_000), Map.of("userId", mai, "amount", 600_000)));
        JsonNode summary = send(post("/api/v1/trips/" + tripId + "/expenses"), linhToken, body, 201);
        assertThat(summary.get("expenses").get(0).get("splitMode").asText()).isEqualTo("CUSTOM");
        assertThat(member(summary, mai).get("net").asLong()).isEqualTo(-600_000);
    }

    @Test
    void permissionsAndMembership() throws Exception {
        // Mọi thành viên ghi khoản mình trả được; ghi hộ người khác chỉ OWNER
        JsonNode cafe = send(post("/api/v1/trips/" + tripId + "/expenses"), ngocToken,
                equal("Cafe", 90_000, ngoc, List.of(ngoc, linh)), 201);
        long cafeId = expense(cafe, e -> e.get("title").asText().equals("Cafe")).get("id").asLong();
        send(post("/api/v1/trips/" + tripId + "/expenses"), ngocToken,
                equal("Ghi hộ", 90_000, linh, List.of(ngoc, linh)), 403);
        send(post("/api/v1/trips/" + tripId + "/expenses"), maiToken,
                equal("Ghi hộ", 90_000, linh, List.of(mai, linh)), 403); // EDITOR cũng không ghi hộ
        JsonNode summary = send(post("/api/v1/trips/" + tripId + "/expenses"), linhToken,
                equal("Taxi", 120_000, mai, List.of(linh, mai)), 201);  // OWNER ghi hộ Mai
        long taxiId = expense(summary, e -> e.get("title").asText().equals("Taxi")).get("id").asLong();

        // Lỗi người dùng báo: EDITOR (mai) KHÔNG được sửa/xóa khoản do người khác ghi & trả (cafe của ngọc)
        JsonNode asMai = read(mvc.perform(auth(get("/api/v1/trips/" + tripId + "/expenses"), maiToken))
                .andReturn().getResponse().getContentAsString());
        assertThat(expense(asMai, e -> e.get("id").asLong() == cafeId).get("canEdit").asBoolean()).isFalse();
        assertThat(expense(asMai, e -> e.get("id").asLong() == taxiId).get("canEdit").asBoolean()).isTrue(); // mai là người trả
        send(put("/api/v1/expenses/" + cafeId), maiToken, equal("Cafe", 1, ngoc, List.of(ngoc)), 403);
        send(delete("/api/v1/expenses/" + cafeId), maiToken, null, 403);

        // Người tham gia ngoài nhóm → NOT_A_MEMBER
        long stranger = userId(register("nguoila", "Người lạ"));
        mvc.perform(auth(post("/api/v1/trips/" + tripId + "/expenses"), linhToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(equal("X", 10_000, linh, List.of(linh, stranger)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));

        // Người trả (mai, EDITOR) sửa được khoản do OWNER ghi hộ, giữ nguyên người trả;
        // nhưng đổi người trả sang người khác (= ghi hộ) thì không
        send(put("/api/v1/expenses/" + taxiId), ngocToken, equal("Taxi", 1, mai, List.of(mai)), 403);
        JsonNode edited = send(put("/api/v1/expenses/" + taxiId), maiToken,
                equal("Taxi sân bay", 150_000, mai, List.of(linh, mai, ngoc)), 200);
        JsonNode taxi = expense(edited, e -> e.get("id").asLong() == taxiId);
        assertThat(taxi.get("title").asText()).isEqualTo("Taxi sân bay");
        assertThat(taxi.get("shares")).hasSize(3);
        send(put("/api/v1/expenses/" + taxiId), maiToken, equal("Taxi sân bay", 150_000, ngoc, List.of(ngoc)), 403);

        // OWNER sửa/xóa được mọi khoản; người tạo (ngọc) xóa được khoản của mình
        send(put("/api/v1/expenses/" + cafeId), linhToken, equal("Cafe sữa", 95_000, ngoc, List.of(ngoc, linh)), 200);
        send(delete("/api/v1/expenses/" + taxiId), linhToken, null, 200);
        send(delete("/api/v1/expenses/" + cafeId), ngocToken, null, 200);
    }

    @Test
    void settlementFlowAndMemberRemovalBlocked() throws Exception {
        send(post("/api/v1/trips/" + tripId + "/expenses"), linhToken,
                equal("Vé máy bay", 300_000, linh, List.of(linh, mai, ngoc)), 201);

        // Ngọc báo đã chuyển 100k → PENDING, chưa tính
        JsonNode pending = send(post("/api/v1/trips/" + tripId + "/settlements"), ngocToken,
                Map.of("fromUserId", ngoc, "toUserId", linh, "amount", 100_000), 201);
        long settlementId = pending.get("settlements").get(0).get("id").asLong();
        assertThat(pending.get("settlements").get(0).get("status").asText()).isEqualTo("PENDING");
        assertThat(member(pending, ngoc).get("net").asLong()).isEqualTo(-100_000);

        // Chỉ người nhận xác nhận
        send(post("/api/v1/settlements/" + settlementId + "/confirm"), ngocToken, null, 400);
        JsonNode confirmed = send(post("/api/v1/settlements/" + settlementId + "/confirm"), linhToken, null, 200);
        assertThat(member(confirmed, ngoc).get("net").asLong()).isZero();
        assertThat(confirmed.get("transfers")).hasSize(1); // còn Mai → Linh

        // Người nhận ghi nhận tiền mặt → CONFIRMED luôn
        JsonNode cash = send(post("/api/v1/trips/" + tripId + "/settlements"), linhToken,
                Map.of("fromUserId", mai, "toUserId", linh, "amount", 100_000), 201);
        assertThat(cash.get("transfers")).isEmpty();

        // Người ngoài cuộc không tạo được; chuyển cho chính mình → 400
        send(post("/api/v1/trips/" + tripId + "/settlements"), maiToken,
                Map.of("fromUserId", ngoc, "toUserId", linh, "amount", 1), 400);
        send(post("/api/v1/trips/" + tripId + "/settlements"), maiToken,
                Map.of("fromUserId", mai, "toUserId", mai, "amount", 1), 400);

        // Còn dính tiền → không xóa / rời nhóm được
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + ngoc), linhToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MEMBER_HAS_EXPENSES"));
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + ngoc), ngocToken))
                .andExpect(status().isConflict());

        // Xóa cả trip có expenses + settlements không lỗi FK
        mvc.perform(auth(delete("/api/v1/trips/" + tripId), linhToken)).andExpect(status().isNoContent());
    }

    @Test
    void bankAccountSaveNormalizeAndShowToTripMembers() throws Exception {
        JsonNode me = send(put("/api/v1/users/me/bank"), linhToken,
                Map.of("bankBin", "970436", "accountNo", "0011 0044 55", "accountName", "Nguyễn Thị  Linh"), 200);
        assertThat(me.get("bank").get("shortName").asText()).isEqualTo("Vietcombank");
        assertThat(me.get("bank").get("accountNo").asText()).isEqualTo("0011004455");
        assertThat(me.get("bank").get("accountName").asText()).isEqualTo("NGUYEN THI LINH");

        send(put("/api/v1/users/me/bank"), linhToken,
                Map.of("bankBin", "999999", "accountNo", "123456", "accountName", "A"), 400);
        send(put("/api/v1/users/me/bank"), linhToken,
                Map.of("bankBin", "970436", "accountNo", "12ab", "accountName", "A"), 400);

        // Thành viên cùng chuyến thấy STK để quét QR
        JsonNode summary = read(mvc.perform(auth(get("/api/v1/trips/" + tripId + "/expenses"), ngocToken))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(member(summary, linh).get("bank").get("bin").asText()).isEqualTo("970436");
        assertThat(member(summary, mai).get("bank").isNull()).isTrue();

        JsonNode cleared = send(delete("/api/v1/users/me/bank"), linhToken, null, 200);
        assertThat(cleared.get("bank").isNull()).isTrue();
        mvc.perform(auth(get("/api/v1/banks"), ngocToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].bin").value("970436"));
    }

    // ---------------------------------------------------------------- helpers

    private static Map<String, Object> base(String title, long amount, long paidBy) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", title);
        body.put("category", title.equals("Homestay") ? "STAY" : "FOOD");
        body.put("amount", amount);
        body.put("paidBy", paidBy);
        return body;
    }

    private static Map<String, Object> equal(String title, long amount, long paidBy, List<Long> participants) {
        Map<String, Object> body = base(title, amount, paidBy);
        body.put("splitMode", "EQUAL");
        body.put("participantIds", participants);
        return body;
    }

    private static JsonNode expense(JsonNode summary, java.util.function.Predicate<JsonNode> match) {
        for (JsonNode e : summary.get("expenses")) {
            if (match.test(e)) {
                return e;
            }
        }
        throw new AssertionError("Không thấy khoản chi");
    }

    private static JsonNode member(JsonNode summary, long userId) {
        for (JsonNode m : summary.get("members")) {
            if (m.get("userId").asLong() == userId) {
                return m;
            }
        }
        throw new AssertionError("Không thấy member " + userId);
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
