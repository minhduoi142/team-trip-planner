package com.tripplanner.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.auth.GoogleTokenVerifier.GoogleProfile;
import com.tripplanner.notification.UnsubscribeTokens.Scope;
import com.tripplanner.notification.mail.MailDeliveryException;
import com.tripplanner.notification.mail.MailGateway;
import com.tripplanner.notification.mail.OutgoingEmail;
import com.tripplanner.support.IntegrationTest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.ResultActions;

class NotificationSettingsIntegrationTest extends IntegrationTest {

    private static final Pattern TOKEN = Pattern.compile("verify-email\\?token=([A-Za-z0-9_-]+)");

    @MockitoBean
    private MailGateway mailGateway;

    @Autowired
    private UnsubscribeTokens unsubscribeTokens;

    @BeforeEach
    void mailConfigured() {
        given(mailGateway.isConfigured()).willReturn(true);
    }

    @Test
    void defaultsThenUpdatePrefs() throws Exception {
        String lan = register("lan", "Lan");

        JsonNode settings = settings(lan);
        assertThat(settings.get("notifyEmail").isNull()).isTrue();
        assertThat(settings.get("pendingEmail").isNull()).isTrue();
        assertThat(settings.get("mailConfigured").asBoolean()).isTrue();
        assertThat(settings.get("emailEnabled").asBoolean()).isTrue();
        assertThat(settings.get("countdownEnabled").asBoolean()).isTrue();
        assertThat(settings.get("memberEnabled").asBoolean()).isTrue();
        assertThat(settings.get("expenseEnabled").asBoolean()).isTrue();

        mvc.perform(auth(put("/api/v1/users/me/notification-settings"), lan)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("emailEnabled", true, "countdownEnabled", false,
                                "memberEnabled", true, "expenseEnabled", false))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.countdownEnabled").value(false))
                .andExpect(jsonPath("$.expenseEnabled").value(false));
        assertThat(settings(lan).get("memberEnabled").asBoolean()).isTrue();

        // Thiếu trường → 400
        mvc.perform(auth(put("/api/v1/users/me/notification-settings"), lan)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("emailEnabled", true))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void requestThenVerifyEmail() throws Exception {
        String lan = register("lan", "Lan");

        requestEmail(lan, "Lan@Example.com").andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingEmail").value("lan@example.com"))
                .andExpect(jsonPath("$.notifyEmail").isEmpty());
        String token = sentToken("lan@example.com");

        // Token chỉ lưu SHA-256
        String storedHash = jdbc.queryForObject("SELECT token_hash FROM email_verifications", String.class);
        assertThat(storedHash).isNotEqualTo(token).hasSize(64);

        mvc.perform(post("/api/v1/notifications/verify-email")
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("token", token))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("lan@example.com"));
        JsonNode settings = settings(lan);
        assertThat(settings.get("notifyEmail").asText()).isEqualTo("lan@example.com");
        assertThat(settings.get("pendingEmail").isNull()).isTrue();

        // Dùng lại token → không còn hợp lệ
        verifyToken(token).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EMAIL_VERIFICATION"));
    }

    @Test
    void changingEmailKeepsOldOneUntilNewIsVerified() throws Exception {
        String lan = register("lan", "Lan");
        requestEmail(lan, "old@example.com").andExpect(status().isOk());
        verifyToken(sentToken("old@example.com")).andExpect(status().isOk());

        jdbc.update("UPDATE email_verifications SET last_sent_at = ?", utcMinutesAgo(5));
        requestEmail(lan, "new@example.com").andExpect(status().isOk())
                .andExpect(jsonPath("$.notifyEmail").value("old@example.com"))
                .andExpect(jsonPath("$.pendingEmail").value("new@example.com"));
    }

    @Test
    void invalidOrExpiredTokenIsRejected() throws Exception {
        String lan = register("lan", "Lan");
        verifyToken("khong-ton-tai").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EMAIL_VERIFICATION"));

        requestEmail(lan, "lan@example.com").andExpect(status().isOk());
        String token = sentToken("lan@example.com");
        jdbc.update("UPDATE email_verifications SET expires_at = ?", utcMinutesAgo(1));
        verifyToken(token).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EMAIL_VERIFICATION"));
        assertThat(settings(lan).get("pendingEmail").isNull()).isTrue();   // hết hạn thì không hiện nữa
    }

    @Test
    void cooldownAndDailyLimit() throws Exception {
        String lan = register("lan", "Lan");
        requestEmail(lan, "lan@example.com").andExpect(status().isOk());
        requestEmail(lan, "lan@example.com").andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("EMAIL_VERIFICATION_COOLDOWN"));

        LocalDate todayVn = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        jdbc.update("UPDATE email_verifications SET last_sent_at = ?, send_date = ?, send_count = 5",
                utcMinutesAgo(2), todayVn);
        requestEmail(lan, "lan@example.com").andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("EMAIL_VERIFICATION_LIMIT"));

        // Sang ngày khác thì bộ đếm làm lại
        jdbc.update("UPDATE email_verifications SET send_date = ?", todayVn.minusDays(1));
        requestEmail(lan, "lan@example.com").andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT send_count FROM email_verifications", Integer.class)).isEqualTo(1);
    }

    @Test
    void sendFailureAndMailNotConfigured() throws Exception {
        String lan = register("lan", "Lan");
        willThrow(new MailDeliveryException("smtp down", null)).given(mailGateway).send(any());
        requestEmail(lan, "lan@example.com").andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("MAIL_SEND_FAILED"));

        given(mailGateway.isConfigured()).willReturn(false);
        String mai = register("mai", "Mai");
        requestEmail(mai, "mai@example.com").andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("MAIL_NOT_CONFIGURED"));
        assertThat(settings(mai).get("mailConfigured").asBoolean()).isFalse();
    }

    @Test
    void invalidEmailIsRejected() throws Exception {
        String lan = register("lan", "Lan");
        requestEmail(lan, "khong-phai-email").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.email").exists());
        requestEmail(lan, "a@b").andExpect(status().isBadRequest());
    }

    @Test
    void removeEmail() throws Exception {
        String lan = register("lan", "Lan");
        requestEmail(lan, "lan@example.com").andExpect(status().isOk());
        verifyToken(sentToken("lan@example.com")).andExpect(status().isOk());

        mvc.perform(auth(delete("/api/v1/users/me/notify-email"), lan))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifyEmail").isEmpty());
    }

    @Test
    void testEmailNeedsVerifiedEmailAndHasCooldown() throws Exception {
        String lan = register("lan", "Lan");
        sendTest(lan).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("NOTIFY_EMAIL_REQUIRED"));

        requestEmail(lan, "lan@example.com").andExpect(status().isOk());
        verifyToken(sentToken("lan@example.com")).andExpect(status().isOk());
        clearInvocations(mailGateway);

        sendTest(lan).andExpect(status().isNoContent());
        ArgumentCaptor<OutgoingEmail> sent = ArgumentCaptor.forClass(OutgoingEmail.class);
        verify(mailGateway).send(sent.capture());
        assertThat(sent.getValue().to()).isEqualTo("lan@example.com");
        assertThat(sent.getValue().headers()).containsKey("List-Unsubscribe");

        sendTest(lan).andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.code").value("TEST_EMAIL_COOLDOWN"));
    }

    @Test
    void googleAccountsGetVerifiedNotifyEmail() throws Exception {
        given(googleTokenVerifier.verify(eq("t-vy")))
                .willReturn(new GoogleProfile("sub-vy", "Vy@Gmail.com", "Vy", null));
        String vy = read(mvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("idToken", "t-vy"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString())
                .get("accessToken").asText();
        assertThat(settings(vy).get("notifyEmail").asText()).isEqualTo("vy@gmail.com");

        // Tài khoản mật khẩu liên kết Google → có email; gỡ Google → vẫn giữ email nhận thông báo
        given(googleTokenVerifier.verify(eq("t-ngoc")))
                .willReturn(new GoogleProfile("sub-ngoc", "ngoc@gmail.com", "Ngọc", null));
        String ngoc = register("ngoc", "Ngọc");
        mvc.perform(auth(put("/api/v1/users/me/google"), ngoc)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("idToken", "t-ngoc"))))
                .andExpect(status().isOk());
        assertThat(settings(ngoc).get("notifyEmail").asText()).isEqualTo("ngoc@gmail.com");
        mvc.perform(auth(delete("/api/v1/users/me/google"), ngoc)).andExpect(status().isOk());
        assertThat(settings(ngoc).get("notifyEmail").asText()).isEqualTo("ngoc@gmail.com");
    }

    @Test
    void ownGoogleEmailIsVerifiedWithoutSendingMail() throws Exception {
        given(googleTokenVerifier.verify(eq("t-vy")))
                .willReturn(new GoogleProfile("sub-vy", "vy@gmail.com", "Vy", null));
        String vy = read(mvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("idToken", "t-vy"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString())
                .get("accessToken").asText();
        mvc.perform(auth(delete("/api/v1/users/me/notify-email"), vy)).andExpect(status().isOk());

        requestEmail(vy, "VY@gmail.com").andExpect(status().isOk())
                .andExpect(jsonPath("$.notifyEmail").value("vy@gmail.com"))
                .andExpect(jsonPath("$.pendingEmail").isEmpty());
        verify(mailGateway, never()).send(any());
    }

    @Test
    void unsubscribeLinks() throws Exception {
        String lan = register("lan", "Lan");
        long lanId = userId(lan);

        unsubscribe(unsubscribeTokens.sign(lanId, Scope.category(NotificationCategory.EXPENSE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("CATEGORY"))
                .andExpect(jsonPath("$.category").value("EXPENSE"));
        assertThat(settings(lan).get("expenseEnabled").asBoolean()).isFalse();
        assertThat(settings(lan).get("emailEnabled").asBoolean()).isTrue();

        String all = unsubscribeTokens.sign(lanId, Scope.all());
        unsubscribe(all).andExpect(status().isOk()).andExpect(jsonPath("$.scope").value("ALL"));
        unsubscribe(all).andExpect(status().isOk());   // idempotent
        assertThat(settings(lan).get("emailEnabled").asBoolean()).isFalse();

        unsubscribe("gia-mao.token").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_UNSUBSCRIBE_TOKEN"));
    }

    @Test
    void unsubscribeTripMutesOnlyMembers() throws Exception {
        String lan = register("lan", "Lan");
        long lanId = userId(lan);
        long tripId = read(mvc.perform(auth(post("/api/v1/trips"), lan)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", "Đà Lạt"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();

        String token = unsubscribeTokens.sign(lanId, Scope.trip(tripId));
        unsubscribe(token).andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("TRIP"))
                .andExpect(jsonPath("$.tripTitle").value("Đà Lạt"));
        unsubscribe(token).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trip_notification_mutes WHERE trip_id = ? AND user_id = ?",
                Integer.class, tripId, lanId)).isEqualTo(1);

        // Không phải thành viên → không tạo dòng (và không lỗi)
        String mai = register("mai", "Mai");
        unsubscribe(unsubscribeTokens.sign(userId(mai), Scope.trip(tripId))).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trip_notification_mutes", Integer.class)).isEqualTo(1);

        // Xoá chuyến → mute xoá theo (CASCADE), không vướng FK
        mvc.perform(auth(delete("/api/v1/trips/" + tripId), lan)).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trip_notification_mutes", Integer.class)).isZero();
    }

    @Test
    void oneClickUnsubscribeAcceptsFormPost() throws Exception {
        String lan = register("lan", "Lan");
        String token = unsubscribeTokens.sign(userId(lan), Scope.category(NotificationCategory.MEMBER));

        mvc.perform(post("/api/v1/notifications/unsubscribe/one-click").param("token", token)
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED).content("List-Unsubscribe=One-Click"))
                .andExpect(status().isOk());
        assertThat(settings(lan).get("memberEnabled").asBoolean()).isFalse();
    }

    // ---------------------------------------------------------------- helpers

    private JsonNode settings(String token) throws Exception {
        return read(mvc.perform(auth(get("/api/v1/users/me/notification-settings"), token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private ResultActions requestEmail(String token, String email) throws Exception {
        return mvc.perform(auth(post("/api/v1/users/me/notify-email"), token)
                .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("email", email))));
    }

    private ResultActions verifyToken(String token) throws Exception {
        return mvc.perform(post("/api/v1/notifications/verify-email")
                .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("token", token))));
    }

    private ResultActions sendTest(String token) throws Exception {
        return mvc.perform(auth(post("/api/v1/users/me/notify-email/test"), token));
    }

    private ResultActions unsubscribe(String token) throws Exception {
        return mvc.perform(post("/api/v1/notifications/unsubscribe")
                .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("token", token))));
    }

    /** Token gốc trong mail xác minh gần nhất gửi tới {@code to}. */
    private String sentToken(String to) {
        ArgumentCaptor<OutgoingEmail> captor = ArgumentCaptor.forClass(OutgoingEmail.class);
        verify(mailGateway, times(1)).send(captor.capture());
        OutgoingEmail mail = captor.getValue();
        assertThat(mail.to()).isEqualTo(to);
        Matcher m = TOKEN.matcher(mail.text());
        assertThat(m.find()).isTrue();
        clearInvocations(mailGateway);
        return m.group(1);
    }

    private static LocalDateTime utcMinutesAgo(int minutes) {
        return LocalDateTime.now(ZoneOffset.UTC).minusMinutes(minutes);
    }
}
