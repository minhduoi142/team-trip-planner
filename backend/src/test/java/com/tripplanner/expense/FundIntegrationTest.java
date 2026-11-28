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

/** Quỹ chung (docs/sdd-trip-fund.md): linh OWNER, mai EDITOR (thủ quỹ), ngọc VIEWER. */
class FundIntegrationTest extends IntegrationTest {

    private static final long TARGET = 2_000_000;

    private String linhToken;
    private String maiToken;
    private String ngocToken;
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

    private JsonNode enableFund(long treasurer, long target, String token, int expected) throws Exception {
        return send(put("/api/v1/trips/" + tripId + "/fund"), token,
                Map.of("treasurerId", treasurer, "perPersonTarget", target), expected);
    }

    private JsonNode contribute(String token, long from, long to, long amount, String kind, int expected)
            throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("fromUserId", from);
        body.put("toUserId", to);
        body.put("amount", amount);
        body.put("kind", kind);
        return send(post("/api/v1/trips/" + tripId + "/settlements"), token, body, expected);
    }

    private static Map<String, Object> expense(String title, long amount, long paidBy, List<Long> participants,
                                               Boolean fromFund) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", title);
        body.put("category", "FOOD");
        body.put("amount", amount);
        body.put("paidBy", paidBy);
        body.put("splitMode", "EQUAL");
        body.put("participantIds", participants);
        body.put("fromFund", fromFund);
        return body;
    }

    private static JsonNode fundMember(JsonNode summary, long userId) {
        for (JsonNode m : summary.get("fund").get("members")) {
            if (m.get("userId").asLong() == userId) {
                return m;
            }
        }
        throw new AssertionError("không có " + userId);
    }

    private static long net(JsonNode summary, long userId) {
        for (JsonNode m : summary.get("members")) {
            if (m.get("userId").asLong() == userId) {
                return m.get("net").asLong();
            }
        }
        throw new AssertionError("không có " + userId);
    }

    @Test
    void onlyOwnerEnablesAndTreasurerMustBeMember() throws Exception {
        JsonNode none = send(get("/api/v1/trips/" + tripId + "/expenses"), linhToken, null, 200);
        assertThat(none.get("fund").isNull()).isTrue();

        enableFund(mai, TARGET, maiToken, 403);
        long stranger = userId(register("lan", "Lan"));
        mvc.perform(auth(put("/api/v1/trips/" + tripId + "/fund"), linhToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("treasurerId", stranger, "perPersonTarget", TARGET))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NOT_A_MEMBER"));
        enableFund(mai, 500, linhToken, 400);   // dưới 1.000đ

        JsonNode summary = enableFund(mai, TARGET, linhToken, 200);
        JsonNode fund = summary.get("fund");
        assertThat(fund.get("treasurerId").asLong()).isEqualTo(mai);
        assertThat(fund.get("perPersonTarget").asLong()).isEqualTo(TARGET);
        // Phần của thủ quỹ coi như đã nộp đủ
        assertThat(fund.get("totalContributed").asLong()).isEqualTo(TARGET);
        assertThat(fundMember(summary, mai).get("treasurer").asBoolean()).isTrue();
        assertThat(fundMember(summary, mai).get("remaining").asLong()).isZero();
        assertThat(fundMember(summary, ngoc).get("remaining").asLong()).isEqualTo(TARGET);
        assertThat(fund.get("canManage").asBoolean()).isTrue();
        assertThat(fund.get("inUse").asBoolean()).isFalse();

        JsonNode asNgoc = send(get("/api/v1/trips/" + tripId + "/expenses"), ngocToken, null, 200);
        assertThat(asNgoc.get("fund").get("canManage").asBoolean()).isFalse();
        assertThat(asNgoc.get("fund").get("canSpend").asBoolean()).isFalse();
        JsonNode asMai = send(get("/api/v1/trips/" + tripId + "/expenses"), maiToken, null, 200);
        assertThat(asMai.get("fund").get("canSpend").asBoolean()).isTrue();   // thủ quỹ
    }

    @Test
    void contributionsGoToTreasurerAndNeedConfirmation() throws Exception {
        contribute(ngocToken, ngoc, mai, TARGET, "FUND", 400);   // chưa bật quỹ
        enableFund(mai, TARGET, linhToken, 200);

        mvc.perform(auth(post("/api/v1/trips/" + tripId + "/settlements"), ngocToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("fromUserId", ngoc, "toUserId", linh, "amount", TARGET, "kind", "FUND"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TRANSFER_TARGET"));

        JsonNode summary = contribute(ngocToken, ngoc, mai, 1_500_000, "FUND", 201);
        assertThat(fundMember(summary, ngoc).get("pending").asLong()).isEqualTo(1_500_000);
        assertThat(fundMember(summary, ngoc).get("remaining").asLong()).isEqualTo(500_000);
        assertThat(summary.get("fund").get("balance").asLong()).isEqualTo(TARGET);   // chưa xác nhận → chưa tính
        assertThat(summary.get("fund").get("inUse").asBoolean()).isTrue();
        assertThat(summary.get("settlements").get(0).get("kind").asText()).isEqualTo("FUND");
        long settlementId = summary.get("settlements").get(0).get("id").asLong();

        summary = send(post("/api/v1/settlements/" + settlementId + "/confirm"), maiToken, null, 200);
        assertThat(fundMember(summary, ngoc).get("contributed").asLong()).isEqualTo(1_500_000);
        assertThat(fundMember(summary, ngoc).get("pending").asLong()).isZero();
        assertThat(summary.get("fund").get("totalContributed").asLong()).isEqualTo(TARGET + 1_500_000);

        // Thủ quỹ ghi nhận tiền mặt của Linh: xác nhận luôn
        summary = contribute(maiToken, linh, mai, TARGET, "FUND", 201);
        assertThat(fundMember(summary, linh).get("contributed").asLong()).isEqualTo(TARGET);
        assertThat(fundMember(summary, linh).get("remaining").asLong()).isZero();
    }

    @Test
    void fullTripRefundsLeftoverThroughSuggestedTransfers() throws Exception {
        enableFund(mai, TARGET, linhToken, 200);
        contribute(maiToken, linh, mai, TARGET, "FUND", 201);   // thủ quỹ ghi nhận → CONFIRMED
        contribute(maiToken, ngoc, mai, TARGET, "FUND", 201);

        // Thủ quỹ chi 4,5 triệu từ quỹ; gửi paidBy = linh nhưng bị đặt lại là thủ quỹ
        JsonNode summary = send(post("/api/v1/trips/" + tripId + "/expenses"), maiToken,
                expense("Homestay", 4_500_000, linh, List.of(linh, mai, ngoc), true), 201);
        JsonNode expense = summary.get("expenses").get(0);
        assertThat(expense.get("fromFund").asBoolean()).isTrue();
        assertThat(expense.get("paidBy").asLong()).isEqualTo(mai);

        JsonNode fund = summary.get("fund");
        assertThat(fund.get("totalContributed").asLong()).isEqualTo(6_000_000);
        assertThat(fund.get("totalSpent").asLong()).isEqualTo(4_500_000);
        assertThat(fund.get("balance").asLong()).isEqualTo(1_500_000);

        // Số dư tự đúng: Mai trả lại mỗi người 500k, không còn gợi ý nào khác
        assertThat(net(summary, linh)).isEqualTo(500_000);
        assertThat(net(summary, ngoc)).isEqualTo(500_000);
        assertThat(net(summary, mai)).isEqualTo(-1_000_000);
        JsonNode transfers = summary.get("transfers");
        assertThat(transfers).hasSize(2);
        transfers.forEach(t -> {
            assertThat(t.get("fromUserId").asLong()).isEqualTo(mai);
            assertThat(t.get("amount").asLong()).isEqualTo(500_000);
        });
    }

    @Test
    void onlyTreasurerOrOwnerSpendsFromFund() throws Exception {
        send(post("/api/v1/trips/" + tripId + "/expenses"), linhToken,
                expense("Taxi", 300_000, linh, List.of(linh, mai), true), 400);   // chưa bật quỹ
        enableFund(mai, TARGET, linhToken, 200);
        send(post("/api/v1/trips/" + tripId + "/expenses"), ngocToken,
                expense("Taxi", 300_000, ngoc, List.of(ngoc, mai), true), 403);
        // OWNER ghi được, người trả vẫn là thủ quỹ
        JsonNode summary = send(post("/api/v1/trips/" + tripId + "/expenses"), linhToken,
                expense("Taxi", 300_000, linh, List.of(linh, mai), true), 201);
        assertThat(summary.get("expenses").get(0).get("paidBy").asLong()).isEqualTo(mai);
        // Quỹ âm = thủ quỹ đang ứng (chưa ai nộp ngoài phần thủ quỹ)
        assertThat(summary.get("fund").get("balance").asLong()).isEqualTo(TARGET - 300_000);

        // Khoản chi thường vẫn theo luật cũ: VIEWER ghi khoản mình trả được
        send(post("/api/v1/trips/" + tripId + "/expenses"), ngocToken,
                expense("Cafe", 60_000, ngoc, List.of(ngoc), null), 201);
    }

    @Test
    void treasurerLockedOnceFundIsUsed() throws Exception {
        enableFund(mai, TARGET, linhToken, 200);
        enableFund(linh, TARGET, linhToken, 200);   // chưa có giao dịch → đổi thủ quỹ được
        enableFund(mai, 3_000_000, linhToken, 200);

        // Loại thủ quỹ khỏi nhóm → chặn
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + mai), linhToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MEMBER_IS_TREASURER"));

        contribute(ngocToken, ngoc, mai, 1_000_000, "FUND", 201);   // PENDING cũng tính là đã dùng
        mvc.perform(auth(put("/api/v1/trips/" + tripId + "/fund"), linhToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("treasurerId", linh, "perPersonTarget", TARGET))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FUND_IN_USE"));
        send(delete("/api/v1/trips/" + tripId + "/fund"), linhToken, null, 409);
        // Mức nộp vẫn sửa được (thu thêm đợt 2)
        JsonNode summary = enableFund(mai, 4_000_000, linhToken, 200);
        assertThat(fundMember(summary, ngoc).get("remaining").asLong()).isEqualTo(3_000_000);

        // Xóa chuyến có quỹ → được
        send(delete("/api/v1/trips/" + tripId), linhToken, null, 204);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trip_funds", Integer.class)).isZero();
    }

    @Test
    void disableBeforeUseAndPendingFundDoesNotMarkDebtTransfersPending() throws Exception {
        enableFund(mai, TARGET, linhToken, 200);
        JsonNode summary = send(delete("/api/v1/trips/" + tripId + "/fund"), linhToken, null, 200);
        assertThat(summary.get("fund").isNull()).isTrue();

        // Ngọc nợ Mai 100k (khoản chi thường), đồng thời báo nộp quỹ cho Mai đang chờ
        enableFund(mai, TARGET, linhToken, 200);
        send(post("/api/v1/trips/" + tripId + "/expenses"), maiToken,
                expense("Cafe", 200_000, mai, List.of(mai, ngoc), null), 201);
        summary = contribute(ngocToken, ngoc, mai, 50_000, "FUND", 201);
        JsonNode transfer = summary.get("transfers").get(0);
        assertThat(transfer.get("fromUserId").asLong()).isEqualTo(ngoc);
        assertThat(transfer.get("pendingAmount").asLong()).isZero();   // nộp quỹ không phải trả nợ

        // Không gửi kind = trả nợ như cũ
        Map<String, Object> debt = new HashMap<>();
        debt.put("fromUserId", ngoc);
        debt.put("toUserId", mai);
        debt.put("amount", 100_000);
        summary = send(post("/api/v1/trips/" + tripId + "/settlements"), ngocToken, debt, 201);
        assertThat(summary.get("transfers").get(0).get("pendingAmount").asLong()).isEqualTo(100_000);
    }
}
