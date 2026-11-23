package com.tripplanner.notification;

import com.tripplanner.config.AppProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Dọn outbox mỗi đêm: dòng đã xong giữ 30 ngày, FAILED giữ 90 ngày; yêu cầu xác minh hết hạn quá 1 ngày. */
@Slf4j
@Component
public class NotificationCleanupJob {

    static final Duration KEEP_DONE = Duration.ofDays(30);
    static final Duration KEEP_FAILED = Duration.ofDays(90);
    static final Duration KEEP_EXPIRED_VERIFICATION = Duration.ofDays(1);

    private final NotificationRepository notificationRepository;
    private final EmailVerificationRepository verificationRepository;
    private final Clock clock;
    private final boolean enabled;

    public NotificationCleanupJob(NotificationRepository notificationRepository,
                                  EmailVerificationRepository verificationRepository, Clock clock,
                                  AppProperties properties) {
        this.notificationRepository = notificationRepository;
        this.verificationRepository = verificationRepository;
        this.clock = clock;
        this.enabled = properties.notifications().schedulerEnabled();
    }

    @Scheduled(cron = "0 45 3 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional   // gọi cleanup() nội bộ không qua proxy → mở transaction ở đây
    public void scheduledCleanup() {
        if (enabled) {
            cleanup();
        }
    }

    @Transactional
    public void cleanup() {
        Instant now = clock.instant();
        int notifications = notificationRepository.deleteFinishedBefore(now.minus(KEEP_DONE), now.minus(KEEP_FAILED));
        int verifications = verificationRepository.deleteExpiredBefore(now.minus(KEEP_EXPIRED_VERIFICATION));
        if (notifications + verifications > 0) {
            log.info("Đã dọn {} thông báo cũ và {} yêu cầu xác minh email hết hạn", notifications, verifications);
        }
    }
}
