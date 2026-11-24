package com.tripplanner.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.notification.NotificationOutbox.NewNotification;
import com.tripplanner.support.IntegrationTest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

/** NOTIFY_DELAY_MINUTES > 0: thông báo chờ để gộp nhiều sự kiện vào 1 email. */
@TestPropertySource(properties = "app.notifications.delay-minutes=10")
class NotificationDelayIntegrationTest extends IntegrationTest {

    @Autowired
    private NotificationOutbox outbox;

    @Autowired
    private NotificationDispatcher dispatcher;

    @Test
    void configuredDelayPostponesSending() throws Exception {
        long lan = userId(register("lan", "Lan"));
        jdbc.update("UPDATE users SET notify_email = 'lan@example.com' WHERE id = ?", lan);

        assertThat(outbox.enqueue(new NewNotification(lan, null, NotificationType.MEMBER_JOINED,
                Map.of("memberName", "Ngọc"), null, null, null))).isTrue();

        assertThat(jdbc.queryForObject("SELECT TIMESTAMPDIFF(SECOND, created_at, send_after) FROM notifications",
                Integer.class)).isEqualTo(600);
        assertThat(dispatcher.runOnce().isEmpty()).isTrue();   // chưa tới hạn
        assertThat(jdbc.queryForObject("SELECT status FROM notifications", String.class)).isEqualTo("PENDING");
    }
}
