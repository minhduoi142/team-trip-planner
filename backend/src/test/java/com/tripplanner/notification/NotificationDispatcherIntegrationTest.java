package com.tripplanner.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

import com.tripplanner.notification.NotificationOutbox.NewNotification;
import com.tripplanner.notification.mail.MailDeliveryException;
import com.tripplanner.notification.mail.MailGateway;
import com.tripplanner.notification.mail.OutgoingEmail;
import com.tripplanner.support.IntegrationTest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class NotificationDispatcherIntegrationTest extends IntegrationTest {

    @MockitoBean
    private MailGateway mailGateway;

    @Autowired
    private NotificationDispatcher dispatcher;

    @Autowired
    private NotificationOutbox outbox;

    private long lanId;
    private long tripId;

    @BeforeEach
    void setUp() throws Exception {
        given(mailGateway.isConfigured()).willReturn(true);
        String lan = register("lan", "Lan");
        lanId = userId(lan);
        jdbc.update("UPDATE users SET notify_email = 'lan@example.com' WHERE id = ?", lanId);
        tripId = read(mvc.perform(auth(post("/api/v1/trips"), lan)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", "Đà Lạt"))))
                .andExpect(MockMvcResultMatchers.status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    void dueGroupIsSentAsOneEmailIncludingNotYetDueRows() {
        long joined = enqueue(NotificationType.MEMBER_JOINED, Map.of("memberName", "Ngọc"), null, minutesFromNow(-1));
        long expense = enqueue(NotificationType.EXPENSE_ADDED, expensePayload("Taxi", 100_000), "EXP:1",
                minutesFromNow(8));

        assertThat(dispatcher.runOnce().sent()).isEqualTo(1);

        OutgoingEmail mail = sentMail();
        assertThat(mail.to()).isEqualTo("lan@example.com");
        assertThat(mail.subject()).isEqualTo("[Đà Lạt] 2 cập nhật mới");
        assertThat(mail.html()).contains("Ngọc đã tham gia nhóm", "Taxi");
        assertThat(status(joined)).isEqualTo("SENT");
        assertThat(status(expense)).isEqualTo("SENT");
        assertThat(jdbc.queryForObject("SELECT sent_at IS NOT NULL FROM notifications WHERE id = ?",
                Boolean.class, joined)).isTrue();
    }

    @Test
    void groupWhoseEarliestRowIsNotDueWaits() {
        long id = enqueue(NotificationType.MEMBER_JOINED, Map.of("memberName", "Ngọc"), null, minutesFromNow(5));

        assertThat(dispatcher.runOnce().isEmpty()).isTrue();
        verify(mailGateway, never()).send(any());
        assertThat(status(id)).isEqualTo("PENDING");
    }

    @Test
    void failureIsRetriedWithBackoffThenFails() {
        willThrow(new MailDeliveryException("smtp down", null)).given(mailGateway).send(any());
        long id = enqueue(NotificationType.MEMBER_JOINED, Map.of("memberName", "Ngọc"), null, minutesFromNow(-1));

        assertThat(dispatcher.runOnce().failed()).isEqualTo(1);
        assertThat(status(id)).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT attempts FROM notifications WHERE id = ?", Integer.class, id))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT last_error FROM notifications WHERE id = ?", String.class, id))
                .contains("smtp down");
        LocalDateTime retryAt = jdbc.queryForObject("SELECT send_after FROM notifications WHERE id = ?",
                LocalDateTime.class, id);
        assertThat(retryAt).isAfter(LocalDateTime.now(ZoneOffset.UTC).plusSeconds(30));

        // Lần lỗi thứ 5 → FAILED
        jdbc.update("UPDATE notifications SET attempts = 4, send_after = ? WHERE id = ?", utc(minutesFromNow(-1)), id);
        dispatcher.runOnce();
        assertThat(status(id)).isEqualTo("FAILED");
    }

    @Test
    void recipientWithoutEmailIsSkipped() {
        jdbc.update("UPDATE users SET notify_email = NULL WHERE id = ?", lanId);
        long id = enqueue(NotificationType.MEMBER_JOINED, Map.of("memberName", "Ngọc"), null, minutesFromNow(-1));

        assertThat(dispatcher.runOnce().skipped()).isEqualTo(1);
        assertThat(status(id)).isEqualTo("SKIPPED");
        assertThat(lastError(id)).isEqualTo("NO_EMAIL");
        verify(mailGateway, never()).send(any());
    }

    @Test
    void disabledCategoryAndMutedTripAreSkippedButRemovalStillArrives() {
        jdbc.update("""
                INSERT INTO user_notification_prefs
                    (user_id, email_enabled, countdown_enabled, member_enabled, expense_enabled, updated_at)
                VALUES (?, TRUE, TRUE, TRUE, FALSE, UTC_TIMESTAMP(6))
                """, lanId);
        long expense = enqueue(NotificationType.EXPENSE_ADDED, expensePayload("Taxi", 1), "EXP:1", minutesFromNow(-1));
        long joined = enqueue(NotificationType.MEMBER_JOINED, Map.of("memberName", "Ngọc"), null, minutesFromNow(-1));
        dispatcher.runOnce();
        assertThat(status(expense)).isEqualTo("SKIPPED");
        assertThat(lastError(expense)).isEqualTo("CATEGORY_DISABLED");
        assertThat(status(joined)).isEqualTo("SENT");

        jdbc.update("INSERT INTO trip_notification_mutes (trip_id, user_id, created_at) VALUES (?, ?, UTC_TIMESTAMP(6))",
                tripId, lanId);
        long left = enqueue(NotificationType.MEMBER_LEFT, Map.of("memberName", "Vy"), null, minutesFromNow(-1));
        long removed = enqueue(NotificationType.YOU_WERE_REMOVED, Map.of("removedByName", "Mai"), null,
                minutesFromNow(-1));
        dispatcher.runOnce();
        assertThat(status(left)).isEqualTo("SKIPPED");
        assertThat(lastError(left)).isEqualTo("TRIP_MUTED");
        assertThat(status(removed)).isEqualTo("SENT");
    }

    @Test
    void masterSwitchOffSkipsEverything() {
        jdbc.update("""
                INSERT INTO user_notification_prefs
                    (user_id, email_enabled, countdown_enabled, member_enabled, expense_enabled, updated_at)
                VALUES (?, FALSE, TRUE, TRUE, TRUE, UTC_TIMESTAMP(6))
                """, lanId);
        long id = enqueue(NotificationType.MEMBER_JOINED, Map.of("memberName", "Ngọc"), null, minutesFromNow(-1));

        dispatcher.runOnce();
        assertThat(status(id)).isEqualTo("SKIPPED");
        assertThat(lastError(id)).isEqualTo("DISABLED");
    }

    @Test
    void stuckSendingRowsAreReleasedAndSent() {
        long id = enqueue(NotificationType.MEMBER_JOINED, Map.of("memberName", "Ngọc"), null, minutesFromNow(-30));
        jdbc.update("UPDATE notifications SET status = 'SENDING', claimed_at = ? WHERE id = ?",
                utc(minutesFromNow(-11)), id);

        dispatcher.runOnce();
        assertThat(status(id)).isEqualTo("SENT");
    }

    @Test
    void recentSendingRowsAreLeftAlone() {
        long id = enqueue(NotificationType.MEMBER_JOINED, Map.of("memberName", "Ngọc"), null, minutesFromNow(-30));
        jdbc.update("UPDATE notifications SET status = 'SENDING', claimed_at = ? WHERE id = ?",
                utc(minutesFromNow(-2)), id);

        dispatcher.runOnce();
        assertThat(status(id)).isEqualTo("SENDING");
        verify(mailGateway, never()).send(any());
    }

    @Test
    void sameCoalesceKeyKeepsOnlyNewestRow() {
        long older = enqueue(NotificationType.EXPENSE_ADDED, expensePayload("Taxi cũ", 100_000), "EXP:9",
                minutesFromNow(-2));
        long newer = enqueue(NotificationType.EXPENSE_ADDED, expensePayload("Taxi mới", 120_000), "EXP:9",
                minutesFromNow(-1));

        dispatcher.runOnce();
        assertThat(status(older)).isEqualTo("CANCELLED");
        assertThat(lastError(older)).isEqualTo("SUPERSEDED");
        assertThat(status(newer)).isEqualTo("SENT");
        assertThat(sentMail().html()).contains("Taxi mới").doesNotContain("Taxi cũ");
    }

    @Test
    void countdownIsSentSeparatelyFromDigest() {
        enqueue(NotificationType.MEMBER_JOINED, Map.of("memberName", "Ngọc"), null, minutesFromNow(-1));
        enqueue(NotificationType.COUNTDOWN, Map.of("tripTitle", "Đà Lạt", "daysLeft", 3,
                "startDate", "2026-12-05", "endDate", "2026-12-07"), null, minutesFromNow(-1));

        assertThat(dispatcher.runOnce().sent()).isEqualTo(2);
        verify(mailGateway, times(2)).send(any());
    }

    @Test
    void mailNotConfiguredSkipsWithoutRetry() {
        given(mailGateway.isConfigured()).willReturn(false);
        long id = enqueue(NotificationType.MEMBER_JOINED, Map.of("memberName", "Ngọc"), null, minutesFromNow(-1));

        dispatcher.runOnce();
        assertThat(status(id)).isEqualTo("SKIPPED");
        assertThat(lastError(id)).isEqualTo("MAIL_DISABLED");
    }

    @Test
    void dailyLimitKeepsRowsPending() {
        // 400 email đã gửi hôm nay (mỗi nhóm 1 sent_at khác nhau)
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<Object[]> rows = new ArrayList<>();
        for (int i = 0; i < 400; i++) {
            LocalDateTime sentAt = now.minusNanos((i + 1) * 1_000L);
            rows.add(new Object[]{lanId, tripId, sentAt, sentAt, sentAt, sentAt});
        }
        jdbc.batchUpdate("""
                INSERT INTO notifications (user_id, trip_id, type, payload, status, send_after, attempts, sent_at,
                                           created_at, updated_at)
                VALUES (?, ?, 'MEMBER_JOINED', '{}', 'SENT', ?, 0, ?, ?, ?)
                """, rows);
        long id = enqueue(NotificationType.MEMBER_JOINED, Map.of("memberName", "Ngọc"), null, minutesFromNow(-1));

        assertThat(dispatcher.runOnce().isEmpty()).isTrue();
        assertThat(status(id)).isEqualTo("PENDING");
    }

    @Test
    void outboxDedupKeyIsIdempotent() {
        NewNotification n = new NewNotification(lanId, tripId, NotificationType.COUNTDOWN, Map.of("daysLeft", 3),
                "CD:test", null, Instant.now());
        assertThat(outbox.enqueue(n)).isTrue();
        assertThat(outbox.enqueue(n)).isFalse();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE dedup_key = 'CD:test'",
                Integer.class)).isEqualTo(1);
    }

    // ---------------------------------------------------------------- helpers

    private long enqueue(NotificationType type, Map<String, ?> payload, String coalesceKey, Instant sendAfter) {
        assertThat(outbox.enqueue(new NewNotification(lanId, tripId, type, payload, null, coalesceKey, sendAfter)))
                .isTrue();
        return jdbc.queryForObject("SELECT MAX(id) FROM notifications", Long.class);
    }

    private static Map<String, Object> expensePayload(String title, long share) {
        return Map.of("actorName", "Linh", "expenseTitle", title, "amount", 300_000, "paidByName", "Linh",
                "yourShare", share);
    }

    private OutgoingEmail sentMail() {
        ArgumentCaptor<OutgoingEmail> captor = ArgumentCaptor.forClass(OutgoingEmail.class);
        verify(mailGateway).send(captor.capture());
        return captor.getValue();
    }

    private String status(long id) {
        return jdbc.queryForObject("SELECT status FROM notifications WHERE id = ?", String.class, id);
    }

    private String lastError(long id) {
        return jdbc.queryForObject("SELECT last_error FROM notifications WHERE id = ?", String.class, id);
    }

    private static Instant minutesFromNow(long minutes) {
        return Instant.now().plus(minutes, ChronoUnit.MINUTES);
    }

    private static LocalDateTime utc(Instant instant) {
        return LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
    }
}
