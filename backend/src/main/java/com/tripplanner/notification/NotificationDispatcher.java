package com.tripplanner.notification;

import com.tripplanner.common.BusinessException;
import com.tripplanner.config.AppProperties;
import com.tripplanner.notification.mail.MailGateway;
import com.tripplanner.notification.mail.NotificationMailBuilder;
import com.tripplanner.notification.mail.NotificationMailBuilder.GroupMail;
import com.tripplanner.notification.mail.NotificationMailBuilder.GroupRow;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripRepository;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Gửi email từ outbox (docs/sdd-email-notifications.md §4.3). Mỗi nhóm (người nhận, chuyến, kênh) có ít nhất 1 dòng
 * đến hạn thì MỌI dòng PENDING của nhóm đi chung 1 email. Claim bằng {@code FOR UPDATE SKIP LOCKED} nên chạy nhiều
 * instance cũng không gửi trùng.
 */
@Slf4j
@Component
public class NotificationDispatcher {

    static final Duration STUCK_AFTER = Duration.ofMinutes(10);
    private static final int MAX_ERROR_LENGTH = 500;

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    private final TransactionTemplate tx;
    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    private final NotificationPreferences preferences;
    private final MailGateway mailGateway;
    private final NotificationMailBuilder mailBuilder;
    private final Clock clock;
    private final AppProperties.Notifications config;

    public NotificationDispatcher(JdbcTemplate jdbc, NamedParameterJdbcTemplate named, TransactionTemplate tx,
                                  UserRepository userRepository, TripRepository tripRepository,
                                  NotificationPreferences preferences, MailGateway mailGateway,
                                  NotificationMailBuilder mailBuilder, Clock clock, AppProperties properties) {
        this.jdbc = jdbc;
        this.named = named;
        this.tx = tx;
        this.userRepository = userRepository;
        this.tripRepository = tripRepository;
        this.preferences = preferences;
        this.mailGateway = mailGateway;
        this.mailBuilder = mailBuilder;
        this.clock = clock;
        this.config = properties.notifications();
    }

    /** Kết quả 1 lượt chạy (để log và test). */
    public record RunResult(int sent, int skipped, int failed) {

        public boolean isEmpty() {
            return sent == 0 && skipped == 0 && failed == 0;
        }
    }

    record DueRow(long id, long userId, Long tripId, NotificationType type, String payload, String coalesceKey,
                  int attempts) {
    }

    private record GroupKey(long userId, Long tripId, boolean countdown) {
    }

    @Scheduled(fixedDelayString = "${app.notifications.dispatch-interval-ms:10000}", initialDelay = 15_000)
    public void scheduledRun() {
        if (!config.schedulerEnabled()) {
            return;
        }
        try {
            RunResult result = runOnce();
            if (!result.isEmpty()) {
                log.info("Thông báo email: gửi {} · bỏ qua {} · lỗi {}", result.sent(), result.skipped(), result.failed());
            }
        } catch (RuntimeException e) {
            log.error("Lượt gửi thông báo email bị lỗi", e);
        }
    }

    public RunResult runOnce() {
        Instant now = clock.instant();
        releaseStuck(now);

        int remaining = config.dailyLimit() - sentEmailsToday(now);
        if (remaining <= 0) {
            log.warn("Đã chạm giới hạn {} email/ngày, các thông báo còn lại gửi tiếp vào ngày mai", config.dailyLimit());
            return new RunResult(0, 0, 0);
        }

        Map<GroupKey, List<DueRow>> groups = claim(now, Math.min(config.batchSize(), remaining));
        int sent = 0;
        int skipped = 0;
        int failed = 0;
        for (Map.Entry<GroupKey, List<DueRow>> group : groups.entrySet()) {
            switch (process(group.getKey(), group.getValue())) {
                case SENT -> sent++;
                case SKIPPED -> skipped++;
                case FAILED -> failed++;
            }
        }
        return new RunResult(sent, skipped, failed);
    }

    // ---------------------------------------------------------------- claim

    /** Dòng SENDING kẹt quá lâu (app chết giữa chừng) → trả về PENDING. At-least-once: hiếm khi trùng 1 mail. */
    private void releaseStuck(Instant now) {
        int released = jdbc.update("""
                        UPDATE notifications SET status = 'PENDING', claimed_at = NULL, updated_at = ?
                        WHERE status = 'SENDING' AND claimed_at < ?
                        """,
                Db.utc(now), Db.utc(now.minus(STUCK_AFTER)));
        if (released > 0) {
            log.warn("Trả {} thông báo kẹt ở trạng thái SENDING về PENDING", released);
        }
    }

    /** Số email (nhóm) đã gửi từ 00:00 hôm nay theo giờ VN. */
    private int sentEmailsToday(Instant now) {
        Instant startOfDay = LocalDate.now(clock).atStartOfDay(clock.getZone()).toInstant();
        Integer count = jdbc.queryForObject("""
                        SELECT COUNT(DISTINCT user_id, COALESCE(trip_id, 0), sent_at) FROM notifications
                        WHERE status = 'SENT' AND sent_at >= ?
                        """,
                Integer.class, Db.utc(startOfDay));
        return count == null ? 0 : count;
    }

    private Map<GroupKey, List<DueRow>> claim(Instant now, int maxGroups) {
        Map<GroupKey, List<DueRow>> result = tx.execute(status -> {
            List<GroupKey> keys = jdbc.query("""
                            SELECT user_id, trip_id, (type = 'COUNTDOWN') AS is_countdown
                            FROM notifications
                            WHERE status = 'PENDING'
                            GROUP BY user_id, trip_id, is_countdown
                            HAVING MIN(send_after) <= ?
                            ORDER BY MIN(send_after)
                            LIMIT ?
                            """,
                    (rs, i) -> new GroupKey(rs.getLong("user_id"), (Long) rs.getObject("trip_id", Long.class),
                            rs.getBoolean("is_countdown")),
                    Db.utc(now), maxGroups);

            Map<GroupKey, List<DueRow>> claimed = new HashMap<>();
            List<Long> ids = new ArrayList<>();
            for (GroupKey key : keys) {
                List<DueRow> rows = jdbc.query("""
                                SELECT id, user_id, trip_id, type, payload, coalesce_key, attempts
                                FROM notifications
                                WHERE status = 'PENDING' AND user_id = ? AND trip_id <=> ?
                                  AND (type = 'COUNTDOWN') = ?
                                ORDER BY id
                                FOR UPDATE SKIP LOCKED
                                """,
                        (rs, i) -> new DueRow(rs.getLong("id"), rs.getLong("user_id"),
                                (Long) rs.getObject("trip_id", Long.class),
                                NotificationType.valueOf(rs.getString("type")), rs.getString("payload"),
                                rs.getString("coalesce_key"), rs.getInt("attempts")),
                        key.userId(), key.tripId(), key.countdown());
                if (!rows.isEmpty()) {
                    claimed.put(key, rows);
                    rows.forEach(row -> ids.add(row.id()));
                }
            }
            if (!ids.isEmpty()) {
                named.update("""
                                UPDATE notifications SET status = 'SENDING', claimed_at = :now, updated_at = :now
                                WHERE id IN (:ids)
                                """,
                        new MapSqlParameterSource("now", Db.utc(now)).addValue("ids", ids));
            }
            return claimed;
        });
        return result == null ? Map.of() : result;
    }

    // ---------------------------------------------------------------- gửi 1 nhóm

    private enum Outcome { SENT, SKIPPED, FAILED }

    private Outcome process(GroupKey key, List<DueRow> rows) {
        Optional<User> recipient = userRepository.findById(key.userId());
        String to = recipient.map(User::getNotifyEmail).orElse(null);
        if (to == null) {
            finish(rows, NotificationStatus.SKIPPED, "NO_EMAIL");
            return Outcome.SKIPPED;
        }
        UserNotificationPrefs prefs = preferences.of(key.userId());
        if (!prefs.isEmailEnabled()) {
            finish(rows, NotificationStatus.SKIPPED, "DISABLED");
            return Outcome.SKIPPED;
        }

        boolean muted = preferences.isTripMuted(key.tripId(), key.userId());
        List<DueRow> categoryOff = new ArrayList<>();
        List<DueRow> mutedRows = new ArrayList<>();
        List<DueRow> candidates = new ArrayList<>();
        for (DueRow row : rows) {
            if (!prefs.isCategoryEnabled(row.type().category())) {
                categoryOff.add(row);
            } else if (muted && row.type().respectsTripMute()) {
                mutedRows.add(row);
            } else {
                candidates.add(row);
            }
        }
        finish(categoryOff, NotificationStatus.SKIPPED, "CATEGORY_DISABLED");
        finish(mutedRows, NotificationStatus.SKIPPED, "TRIP_MUTED");

        List<DueRow> superseded = new ArrayList<>();
        List<DueRow> toSend = latestPerCoalesceKey(candidates, superseded);
        finish(superseded, NotificationStatus.CANCELLED, "SUPERSEDED");
        if (toSend.isEmpty()) {
            return Outcome.SKIPPED;
        }
        if (!mailGateway.isConfigured()) {
            finish(toSend, NotificationStatus.SKIPPED, "MAIL_DISABLED");
            return Outcome.SKIPPED;
        }

        try {
            String tripTitle = key.tripId() == null ? null
                    : tripRepository.findById(key.tripId()).map(Trip::getTitle).orElse(null);
            mailGateway.send(mailBuilder.group(new GroupMail(key.userId(), to, key.tripId(), tripTitle,
                    key.countdown() ? NotificationChannel.COUNTDOWN : NotificationChannel.DIGEST,
                    toSend.stream().map(row -> new GroupRow(row.type(), row.payload())).toList())));
        } catch (BusinessException e) {   // MAIL_NOT_CONFIGURED: không thử lại
            finish(toSend, NotificationStatus.SKIPPED, "MAIL_DISABLED");
            return Outcome.SKIPPED;
        } catch (RuntimeException e) {
            log.warn("Gửi email thông báo cho user {} thất bại: {}", key.userId(), e.getMessage());
            retryOrFail(toSend, e);
            return Outcome.FAILED;
        }
        Instant sentAt = clock.instant();
        named.update("""
                        UPDATE notifications SET status = 'SENT', sent_at = :now, updated_at = :now, last_error = NULL
                        WHERE id IN (:ids)
                        """,
                new MapSqlParameterSource("now", Db.utc(sentAt)).addValue("ids", ids(toSend)));
        return Outcome.SENT;
    }

    /** Các dòng cùng coalesce_key chỉ giữ dòng mới nhất (id lớn nhất); dòng còn lại đưa vào {@code superseded}. */
    static List<DueRow> latestPerCoalesceKey(List<DueRow> rows, List<DueRow> superseded) {
        Map<String, DueRow> latest = new HashMap<>();
        for (DueRow row : rows) {
            if (row.coalesceKey() != null) {
                latest.merge(row.coalesceKey(), row, (a, b) -> a.id() >= b.id() ? a : b);
            }
        }
        List<DueRow> kept = new ArrayList<>();
        for (DueRow row : rows) {
            if (row.coalesceKey() == null || latest.get(row.coalesceKey()).id() == row.id()) {
                kept.add(row);
            } else {
                superseded.add(row);
            }
        }
        kept.sort(Comparator.comparingLong(DueRow::id));
        return kept;
    }

    /** @return true nếu có dòng chuyển FAILED */
    private boolean retryOrFail(List<DueRow> rows, RuntimeException error) {
        Instant now = clock.instant();
        String message = truncate(error.getClass().getSimpleName() + ": " + error.getMessage());
        boolean anyFailed = false;
        for (DueRow row : rows) {
            int attempts = row.attempts() + 1;
            Optional<Instant> retryAt = RetryPolicy.nextAttemptAt(attempts, now);
            anyFailed |= retryAt.isEmpty();
            jdbc.update("""
                            UPDATE notifications
                            SET status = ?, attempts = ?, send_after = COALESCE(?, send_after), last_error = ?,
                                claimed_at = NULL, updated_at = ?
                            WHERE id = ?
                            """,
                    retryAt.isPresent() ? NotificationStatus.PENDING.name() : NotificationStatus.FAILED.name(),
                    attempts, retryAt.map(Db::utc).orElse(null), message, Db.utc(now), row.id());
        }
        if (anyFailed) {
            log.error("Thông báo email gửi lỗi {} lần, chuyển FAILED: {}", RetryPolicy.MAX_ATTEMPTS, message);
        }
        return anyFailed;
    }

    private void finish(Collection<DueRow> rows, NotificationStatus status, String reason) {
        if (rows.isEmpty()) {
            return;
        }
        LocalDateTime now = Db.utc(clock.instant());
        named.update("""
                        UPDATE notifications SET status = :status, last_error = :reason, claimed_at = NULL,
                            updated_at = :now
                        WHERE id IN (:ids)
                        """,
                new MapSqlParameterSource("status", status.name()).addValue("reason", reason)
                        .addValue("now", now).addValue("ids", ids(rows)));
    }

    private static List<Long> ids(Collection<DueRow> rows) {
        return rows.stream().map(DueRow::id).toList();
    }

    private static String truncate(String value) {
        return value.length() <= MAX_ERROR_LENGTH ? value : value.substring(0, MAX_ERROR_LENGTH);
    }
}
