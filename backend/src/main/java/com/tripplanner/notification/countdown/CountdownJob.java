package com.tripplanner.notification.countdown;

import com.tripplanner.config.AppProperties;
import com.tripplanner.notification.NotificationAudience;
import com.tripplanner.notification.NotificationAudience.Snapshot;
import com.tripplanner.notification.NotificationOutbox;
import com.tripplanner.notification.NotificationOutbox.NewNotification;
import com.tripplanner.notification.NotificationType;
import com.tripplanner.notification.countdown.CountdownContentBuilder.TripInfo;
import com.tripplanner.weather.WeatherService;
import com.tripplanner.weather.dto.TripWeatherResponse;
import java.sql.Date;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

/**
 * Email đếm ngược (docs/sdd-email-notifications.md §7): mỗi sáng (mặc định 08:00 giờ VN) tạo 1 dòng COUNTDOWN cho
 * mỗi thành viên của chuyến đã chốt ngày có ngày đi trùng mốc. {@code dedup_key} chứa cả start_date nên chạy lại
 * (gửi bù khi khởi động) không trùng, còn chốt lại ngày khác thì đếm lại.
 */
@Slf4j
@Component
public class CountdownJob {

    private final NamedParameterJdbcTemplate jdbc;
    private final NotificationAudience audience;
    private final NotificationOutbox outbox;
    private final CountdownContentBuilder content;
    private final WeatherService weatherService;
    private final Clock clock;
    private final AppProperties.Notifications config;

    public CountdownJob(NamedParameterJdbcTemplate jdbc, NotificationAudience audience, NotificationOutbox outbox,
                        CountdownContentBuilder content, WeatherService weatherService, Clock clock,
                        AppProperties properties) {
        this.jdbc = jdbc;
        this.audience = audience;
        this.outbox = outbox;
        this.content = content;
        this.weatherService = weatherService;
        this.clock = clock;
        this.config = properties.notifications();
    }

    @Scheduled(cron = "${app.notifications.countdown-cron:0 0 8 * * *}", zone = "Asia/Ho_Chi_Minh")
    public void scheduledRun() {
        if (config.schedulerEnabled()) {
            run("lịch hằng ngày");
        }
    }

    /** Gửi bù: server khởi động sau giờ chạy hôm nay (vd tắt máy lúc 08:00) thì chạy luôn. */
    @EventListener(ApplicationReadyEvent.class)
    public void catchUpOnStartup() {
        if (config.schedulerEnabled() && isPastTodaysRun(config.countdownCron(), ZonedDateTime.now(clock))) {
            run("gửi bù khi khởi động");
        }
    }

    private void run(String reason) {
        try {
            int created = runFor(LocalDate.now(clock));
            if (created > 0) {
                log.info("Đếm ngược ({}): tạo {} thông báo", reason, created);
            }
        } catch (RuntimeException e) {
            log.error("Job đếm ngược lỗi", e);
        }
    }

    /** @return số dòng thông báo mới tạo (trùng dedup_key không tính) */
    public int runFor(LocalDate today) {
        List<Integer> milestones = config.countdownDays();
        List<Date> dates = milestones.stream().map(d -> Date.valueOf(today.plusDays(d))).toList();
        if (dates.isEmpty()) {
            return 0;
        }
        List<TripInfo> trips = jdbc.query("""
                        SELECT id, title, destination, cover_image_url, start_date, end_date
                        FROM trips WHERE start_date IN (:dates)
                        """,
                new MapSqlParameterSource("dates", dates),
                (rs, i) -> new TripInfo(rs.getLong("id"), rs.getString("title"), rs.getString("destination"),
                        rs.getString("cover_image_url"), rs.getObject("start_date", LocalDate.class),
                        rs.getObject("end_date", LocalDate.class)));

        int created = 0;
        for (TripInfo trip : trips) {
            try {
                created += enqueueTrip(trip, today, milestones);
            } catch (RuntimeException e) {   // 1 chuyến lỗi không chặn các chuyến khác
                log.error("Không tạo được email đếm ngược cho chuyến {}", trip.id(), e);
            }
        }
        return created;
    }

    private int enqueueTrip(TripInfo trip, LocalDate today, List<Integer> milestones) {
        Optional<Integer> daysLeft = CountdownMilestones.milestoneFor(today, trip.startDate(), milestones);
        if (daysLeft.isEmpty()) {
            return 0;
        }
        Snapshot members = audience.load(trip.id(), true, List.of());
        // Job không chạy trong transaction: gọi API thời tiết ở đây không giữ kết nối DB
        TripWeatherResponse weather = weather(trip.id());
        Map<String, Object> shared = content.shared(trip, daysLeft.get(), members.memberIds().size(), weather);
        int created = 0;
        for (long userId : members.memberIds()) {
            if (!members.canReceive(userId, NotificationType.COUNTDOWN)) {
                continue;
            }
            String dedupKey = "CD:" + trip.id() + ":" + userId + ":" + trip.startDate() + ":" + daysLeft.get();
            if (outbox.enqueue(new NewNotification(userId, trip.id(), NotificationType.COUNTDOWN,
                    content.forRecipient(shared, trip.id(), userId), dedupKey, null, clock.instant()))) {
                created++;
            }
        }
        return created;
    }

    /** Thời tiết cho email; lỗi gì cũng chỉ làm mất khối thời tiết, không chặn email đếm ngược. */
    private TripWeatherResponse weather(long tripId) {
        try {
            return weatherService.tripWeatherForSystem(tripId);
        } catch (RuntimeException e) {
            log.warn("Không lấy được thời tiết cho email đếm ngược của chuyến {}: {}", tripId, e.getMessage());
            return null;
        }
    }

    /** Hôm nay cron đã tới giờ chạy chưa (vd 08:00 → true nếu bây giờ ≥ 08:00). */
    static boolean isPastTodaysRun(String cron, ZonedDateTime now) {
        ZonedDateTime startOfDay = now.toLocalDate().atStartOfDay(now.getZone());
        ZonedDateTime firstRunToday = CronExpression.parse(cron).next(startOfDay.minusNanos(1));
        return firstRunToday != null && firstRunToday.toLocalDate().equals(now.toLocalDate())
                && !now.isBefore(firstRunToday);
    }
}
