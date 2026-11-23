package com.tripplanner.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.notification.mail.MailGateway;
import com.tripplanner.notification.mail.OutgoingEmail;
import com.tripplanner.support.IntegrationTest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

/** Domain event → dòng outbox (docs/sdd-email-notifications.md §6). */
class NotificationEventsIntegrationTest extends IntegrationTest {

    @MockitoBean
    private MailGateway mailGateway;

    @Autowired
    private NotificationDispatcher dispatcher;

    private String linhToken;
    private String maiToken;
    private String ngocToken;
    private long linh;
    private long mai;
    private long ngoc;
    private long tripId;
    private String inviteCode;

    @BeforeEach
    void setUp() throws Exception {
        given(mailGateway.isConfigured()).willReturn(true);
        linhToken = register("linh", "Linh");
        maiToken = register("mai", "Mai");
        ngocToken = register("ngoc", "Ngọc");
        linh = userId(linhToken);
        mai = userId(maiToken);
        ngoc = userId(ngocToken);
        jdbc.update("UPDATE users SET notify_email = CONCAT(username, '@example.com')");
        JsonNode trip = send(post("/api/v1/trips"), linhToken, Map.of("title", "Phú Quốc"), 201);
        tripId = trip.get("id").asLong();
        inviteCode = trip.get("inviteCode").asText();
    }

    // ---------------------------------------------------------------- thành viên

    @Test
    void joiningNotifiesOtherMembersOnceAfterWindow() throws Exception {
        join(maiToken);
        assertThat(rows("MEMBER_JOINED")).containsExactly(linh);
        assertThat(jdbc.queryForObject("""
                SELECT TIMESTAMPDIFF(MINUTE, created_at, send_after) FROM notifications WHERE type = 'MEMBER_JOINED'
                """, Integer.class)).isEqualTo(30);
        assertThat(payload("MEMBER_JOINED", linh).get("memberName").asText()).isEqualTo("Mai");

        join(maiToken);   // join lại (idempotent) → không thêm dòng
        assertThat(rows("MEMBER_JOINED")).hasSize(1);

        join(ngocToken);
        assertThat(rows("MEMBER_JOINED")).containsExactlyInAnyOrder(linh, linh, mai);
    }

    @Test
    void leavingAndRemoval() throws Exception {
        join(maiToken);
        join(ngocToken);
        clearOutbox();

        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + mai), maiToken))
                .andExpect(MockMvcResultMatchers.status().isNoContent());
        assertThat(rows("MEMBER_LEFT")).containsExactlyInAnyOrder(linh, ngoc);

        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + ngoc), linhToken))
                .andExpect(MockMvcResultMatchers.status().isNoContent());
        assertThat(rows("MEMBER_REMOVED")).isEmpty();   // chỉ còn OWNER, mà OWNER là người mời ra
        assertThat(rows("YOU_WERE_REMOVED")).containsExactly(ngoc);
        assertThat(payload("YOU_WERE_REMOVED", ngoc).get("removedByName").asText()).isEqualTo("Linh");
    }

    @Test
    void removalNotifiesRemainingMembersExceptOwner() throws Exception {
        join(maiToken);
        join(ngocToken);
        clearOutbox();

        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + ngoc), linhToken))
                .andExpect(MockMvcResultMatchers.status().isNoContent());
        assertThat(rows("MEMBER_REMOVED")).containsExactly(mai);
        JsonNode p = payload("MEMBER_REMOVED", mai);
        assertThat(p.get("memberName").asText()).isEqualTo("Ngọc");
        assertThat(p.get("removedByName").asText()).isEqualTo("Linh");
    }

    // ---------------------------------------------------------------- chi tiêu

    @Test
    void expenseLifecycleInsideWindow() throws Exception {
        joinAll();
        // Linh trả 300k chia 3 → Mai, Ngọc nhận (Linh là người thao tác)
        JsonNode summary = send(post("/api/v1/trips/" + tripId + "/expenses"), linhToken,
                equal("Lẩu gà", 300_000, linh, List.of(linh, mai, ngoc)), 201);
        long expenseId = summary.get("expenses").get(0).get("id").asLong();
        assertThat(rows("EXPENSE_ADDED")).containsExactlyInAnyOrder(mai, ngoc);
        assertThat(payload("EXPENSE_ADDED", mai).get("yourShare").asLong()).isEqualTo(100_000);
        assertThat(payload("EXPENSE_ADDED", mai).get("paidByName").asText()).isEqualTo("Linh");

        // Sửa trong cửa sổ chờ: chỉ còn Linh + Mai → Mai cập nhật payload, Ngọc bị huỷ
        send(put("/api/v1/expenses/" + expenseId), linhToken,
                equal("Lẩu gà lá é", 300_000, linh, List.of(linh, mai)), 200);
        assertThat(rows("EXPENSE_ADDED")).containsExactly(mai);
        assertThat(payload("EXPENSE_ADDED", mai).get("yourShare").asLong()).isEqualTo(150_000);
        assertThat(payload("EXPENSE_ADDED", mai).get("expenseTitle").asText()).isEqualTo("Lẩu gà lá é");
        assertThat(status("EXPENSE_ADDED", ngoc)).isEqualTo("CANCELLED");

        // Xoá khi chưa gửi → huỷ, không có mail "đã xoá"
        send(delete("/api/v1/expenses/" + expenseId), linhToken, null, 200);
        assertThat(rows("EXPENSE_ADDED")).isEmpty();
        assertThat(rows("EXPENSE_DELETED")).isEmpty();
    }

    @Test
    void deletingAfterEmailWasSentSendsDeletion() throws Exception {
        joinAll();
        JsonNode summary = send(post("/api/v1/trips/" + tripId + "/expenses"), linhToken,
                equal("Taxi", 200_000, linh, List.of(linh, mai)), 201);
        long expenseId = summary.get("expenses").get(0).get("id").asLong();
        jdbc.update("UPDATE notifications SET status = 'SENT', sent_at = UTC_TIMESTAMP(6) WHERE type = 'EXPENSE_ADDED'");

        send(put("/api/v1/expenses/" + expenseId), linhToken, equal("Taxi", 240_000, linh, List.of(linh, mai)), 200);
        assertThat(rows("EXPENSE_UPDATED")).containsExactly(mai);

        send(delete("/api/v1/expenses/" + expenseId), linhToken, null, 200);
        assertThat(status("EXPENSE_UPDATED", mai)).isEqualTo("CANCELLED");
        assertThat(rows("EXPENSE_DELETED")).containsExactly(mai);
    }

    @Test
    void settlementFlow() throws Exception {
        joinAll();
        // Mai ghi đã chuyển cho Linh → Linh cần xác nhận
        JsonNode pending = send(post("/api/v1/trips/" + tripId + "/settlements"), maiToken,
                Map.of("fromUserId", mai, "toUserId", linh, "amount", 100_000), 201);
        long settlementId = pending.get("settlements").get(0).get("id").asLong();
        assertThat(rows("SETTLEMENT_PENDING")).containsExactly(linh);

        send(post("/api/v1/settlements/" + settlementId + "/confirm"), linhToken, null, 200);
        assertThat(rows("SETTLEMENT_PENDING")).isEmpty();   // Linh đã tự xác nhận → khỏi nhắc
        assertThat(rows("SETTLEMENT_CONFIRMED")).containsExactly(mai);

        // Ngọc ghi đã chuyển, Linh huỷ → Ngọc được báo
        JsonNode second = send(post("/api/v1/trips/" + tripId + "/settlements"), ngocToken,
                Map.of("fromUserId", ngoc, "toUserId", linh, "amount", 50_000), 201);
        long secondId = second.get("settlements").get(0).get("id").asLong() == settlementId
                ? second.get("settlements").get(1).get("id").asLong() : second.get("settlements").get(0).get("id").asLong();
        send(delete("/api/v1/settlements/" + secondId), linhToken, null, 200);
        assertThat(rows("SETTLEMENT_REJECTED")).containsExactly(ngoc);
    }

    @Test
    void senderCancellingPendingSettlementCancelsReminder() throws Exception {
        joinAll();
        JsonNode pending = send(post("/api/v1/trips/" + tripId + "/settlements"), maiToken,
                Map.of("fromUserId", mai, "toUserId", linh, "amount", 100_000), 201);
        long settlementId = pending.get("settlements").get(0).get("id").asLong();

        send(delete("/api/v1/settlements/" + settlementId), maiToken, null, 200);
        assertThat(rows("SETTLEMENT_PENDING")).isEmpty();
        assertThat(rows("SETTLEMENT_REJECTED")).isEmpty();
    }

    // ---------------------------------------------------------------- lọc người nhận

    @Test
    void recipientsWithoutEmailDisabledCategoryOrMutedGetNoRow() throws Exception {
        joinAll();
        clearOutbox();
        jdbc.update("UPDATE users SET notify_email = NULL WHERE id = ?", ngoc);
        jdbc.update("""
                INSERT INTO user_notification_prefs
                    (user_id, email_enabled, countdown_enabled, member_enabled, expense_enabled, updated_at)
                VALUES (?, TRUE, TRUE, TRUE, FALSE, UTC_TIMESTAMP(6))
                """, mai);
        send(post("/api/v1/trips/" + tripId + "/expenses"), linhToken,
                equal("Taxi", 300_000, linh, List.of(linh, mai, ngoc)), 201);
        assertThat(rows("EXPENSE_ADDED")).isEmpty();

        // Tắt email chuyến → không có dòng
        jdbc.update("DELETE FROM user_notification_prefs");
        send(put("/api/v1/trips/" + tripId + "/notification-mute"), maiToken, Map.of("muted", true), 200);
        send(post("/api/v1/trips/" + tripId + "/expenses"), linhToken,
                equal("Cà phê", 90_000, linh, List.of(linh, mai)), 201);
        assertThat(rows("EXPENSE_ADDED")).isEmpty();
    }

    @Test
    void muteApiCancelsPendingAndIsClearedWhenLeaving() throws Exception {
        joinAll();
        send(post("/api/v1/trips/" + tripId + "/expenses"), linhToken,
                equal("Taxi", 200_000, linh, List.of(linh, mai)), 201);
        assertThat(rows("EXPENSE_ADDED")).containsExactly(mai);

        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/notification-mute"), maiToken))
                .andExpect(jsonPath("$.muted").value(false));
        send(put("/api/v1/trips/" + tripId + "/notification-mute"), maiToken, Map.of("muted", true), 200);
        send(put("/api/v1/trips/" + tripId + "/notification-mute"), maiToken, Map.of("muted", true), 200);
        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/notification-mute"), maiToken))
                .andExpect(jsonPath("$.muted").value(true));
        assertThat(status("EXPENSE_ADDED", mai)).isEqualTo("CANCELLED");

        send(put("/api/v1/trips/" + tripId + "/notification-mute"), maiToken, Map.of("muted", false), 200);
        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/notification-mute"), maiToken))
                .andExpect(jsonPath("$.muted").value(false));

        // Không phải thành viên → 403
        String vy = register("vyvy", "Vy");
        send(put("/api/v1/trips/" + tripId + "/notification-mute"), vy, Map.of("muted", true), 403);

        // Rời nhóm → dòng mute xoá theo (CASCADE)
        send(put("/api/v1/trips/" + tripId + "/notification-mute"), ngocToken, Map.of("muted", true), 200);
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/members/" + ngoc), ngocToken))
                .andExpect(MockMvcResultMatchers.status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trip_notification_mutes", Integer.class)).isZero();
    }

    @Test
    void dispatcherMergesMemberAndExpenseEventsIntoOneEmail() throws Exception {
        join(maiToken);
        send(post("/api/v1/trips/" + tripId + "/expenses"), maiToken,
                equal("Bánh căn", 120_000, mai, List.of(linh, mai)), 201);
        assertThat(rows("MEMBER_JOINED")).containsExactly(linh);
        assertThat(rows("EXPENSE_ADDED")).containsExactly(linh);
        jdbc.update("UPDATE notifications SET send_after = UTC_TIMESTAMP(6) - INTERVAL 1 MINUTE WHERE type = 'EXPENSE_ADDED'");

        assertThat(dispatcher.runOnce().sent()).isEqualTo(1);
        ArgumentCaptor<OutgoingEmail> captor = ArgumentCaptor.forClass(OutgoingEmail.class);
        verify(mailGateway).send(captor.capture());
        OutgoingEmail mail = captor.getValue();
        assertThat(mail.to()).isEqualTo("linh@example.com");
        assertThat(mail.subject()).isEqualTo("[Phú Quốc] 2 cập nhật mới");
        assertThat(mail.html()).contains("Mai đã tham gia nhóm", "Bánh căn", "Phần của bạn 60.000 ₫");
    }

    @Test
    void notificationFailureNeverBreaksBusinessAction() throws Exception {
        // Làm hỏng bảng outbox tạm thời: listener lỗi nhưng join vẫn thành công
        jdbc.execute("ALTER TABLE notifications RENAME TO notifications_tmp");
        try {
            join(maiToken);
        } finally {
            jdbc.execute("ALTER TABLE notifications_tmp RENAME TO notifications");
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trip_members WHERE trip_id = ?", Integer.class, tripId))
                .isEqualTo(2);
    }

    // ---------------------------------------------------------------- helpers

    private void join(String token) throws Exception {
        mvc.perform(auth(post("/api/v1/trips/join/" + inviteCode), token))
                .andExpect(MockMvcResultMatchers.status().isOk());
    }

    private void joinAll() throws Exception {
        join(maiToken);
        join(ngocToken);
        clearOutbox();
    }

    private void clearOutbox() {
        jdbc.update("DELETE FROM notifications");
    }

    /** user_id của các dòng PENDING loại {@code type}. */
    private List<Long> rows(String type) {
        return jdbc.queryForList("SELECT user_id FROM notifications WHERE type = ? AND status = 'PENDING' ORDER BY id",
                Long.class, type);
    }

    private String status(String type, long userId) {
        return jdbc.queryForObject("SELECT status FROM notifications WHERE type = ? AND user_id = ? ORDER BY id DESC LIMIT 1",
                String.class, type, userId);
    }

    private JsonNode payload(String type, long userId) throws Exception {
        return read(jdbc.queryForObject("""
                SELECT payload FROM notifications WHERE type = ? AND user_id = ? ORDER BY id DESC LIMIT 1
                """, String.class, type, userId));
    }

    private static Map<String, Object> equal(String title, long amount, long paidBy, List<Long> participants) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", title);
        body.put("category", "FOOD");
        body.put("amount", amount);
        body.put("paidBy", paidBy);
        body.put("splitMode", "EQUAL");
        body.put("participantIds", participants);
        return body;
    }

    private JsonNode send(MockHttpServletRequestBuilder request, String token, Object body, int expected)
            throws Exception {
        MockHttpServletRequestBuilder builder = auth(request, token);
        if (body != null) {
            builder = builder.contentType(MediaType.APPLICATION_JSON).content(json(body));
        }
        String response = mvc.perform(builder).andExpect(MockMvcResultMatchers.status().is(expected))
                .andReturn().getResponse().getContentAsString();
        return response.isEmpty() ? null : read(response);
    }
}
