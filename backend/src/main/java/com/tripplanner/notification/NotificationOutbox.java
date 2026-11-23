package com.tripplanner.notification;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * API duy nhất để ghi dòng outbox. Ghi bằng JdbcTemplate (lỗi SQL trên MySQL không đánh dấu transaction nghiệp vụ là
 * rollback-only như lỗi JPA) và <b>bắt mọi lỗi</b>: thông báo hỏng không được làm hỏng thao tác chính.
 */
@Slf4j
@Component
public class NotificationOutbox {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public NotificationOutbox(JdbcTemplate jdbc, ObjectMapper objectMapper, Clock clock) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    /**
     * @param sendAfter null = now + cửa sổ chờ của type
     * @param dedupKey  khoá idempotent vĩnh viễn: đã có thì bỏ qua (INSERT IGNORE)
     */
    public record NewNotification(long userId, Long tripId, NotificationType type, Map<String, ?> payload,
                                  String dedupKey, String coalesceKey, Instant sendAfter) {
    }

    /** @return true nếu đã chèn dòng mới (false: trùng dedup_key hoặc lỗi đã được log) */
    public boolean enqueue(NewNotification n) {
        try {
            Instant now = clock.instant();
            Instant sendAfter = n.sendAfter() != null ? n.sendAfter()
                    : now.plusSeconds(n.type().windowMinutes() * 60L);
            int inserted = jdbc.update("""
                            INSERT IGNORE INTO notifications
                                (user_id, trip_id, type, payload, dedup_key, coalesce_key, status, send_after,
                                 attempts, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, 0, ?, ?)
                            """,
                    n.userId(), n.tripId(), n.type().name(), objectMapper.writeValueAsString(n.payload()),
                    n.dedupKey(), n.coalesceKey(), Db.utc(sendAfter), Db.utc(now), Db.utc(now));
            return inserted > 0;
        } catch (JsonProcessingException | RuntimeException e) {
            log.error("Không ghi được thông báo {} cho user {}: {}", n.type(), n.userId(), e.getMessage(), e);
            return false;
        }
    }

    // ---------------------------------------------------------------- gộp / huỷ trong cửa sổ chờ (N2)
    // Các hàm dưới ném lỗi bình thường; NotificationEventListener bọc toàn bộ trong try/catch.

    /** Dòng PENDING cùng coalesce_key của 1 người. */
    public record PendingRef(long id, NotificationType type) {
    }

    /** Mới nhất trước. */
    public List<PendingRef> findPending(String coalesceKey, long userId) {
        return jdbc.query("""
                        SELECT id, type FROM notifications
                        WHERE coalesce_key = ? AND user_id = ? AND status = 'PENDING'
                        ORDER BY id DESC
                        """,
                (rs, i) -> new PendingRef(rs.getLong("id"), NotificationType.valueOf(rs.getString("type"))),
                coalesceKey, userId);
    }

    /** Người này đã từng nhận email về cùng coalesce_key chưa. */
    public boolean wasSent(String coalesceKey, long userId) {
        Boolean sent = jdbc.queryForObject("""
                        SELECT EXISTS(SELECT 1 FROM notifications
                                      WHERE coalesce_key = ? AND user_id = ? AND status = 'SENT')
                        """,
                Boolean.class, coalesceKey, userId);
        return Boolean.TRUE.equals(sent);
    }

    /** Ghi đè payload của dòng còn PENDING (giữ type và send_after: không kéo dài cửa sổ chờ). */
    public void updatePayload(long id, Map<String, ?> payload) {
        try {
            jdbc.update("UPDATE notifications SET payload = ?, updated_at = ? WHERE id = ? AND status = 'PENDING'",
                    objectMapper.writeValueAsString(payload), Db.utc(clock.instant()), id);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Payload không chuyển được sang JSON", e);
        }
    }

    public void cancel(Collection<Long> ids, String reason) {
        for (Long id : ids) {
            jdbc.update("""
                            UPDATE notifications SET status = 'CANCELLED', last_error = ?, updated_at = ?
                            WHERE id = ? AND status = 'PENDING'
                            """,
                    reason, Db.utc(clock.instant()), id);
        }
    }

    /** Huỷ mọi dòng PENDING cùng coalesce_key của 1 người. */
    public void cancelPending(String coalesceKey, long userId, String reason) {
        cancel(findPending(coalesceKey, userId).stream().map(PendingRef::id).toList(), reason);
    }

    /** Tắt email 1 chuyến: huỷ các dòng đang chờ của người đó trong chuyến (trừ YOU_WERE_REMOVED). */
    public int cancelPendingForTrip(long userId, long tripId, String reason) {
        return jdbc.update("""
                        UPDATE notifications SET status = 'CANCELLED', last_error = ?, updated_at = ?
                        WHERE user_id = ? AND trip_id = ? AND status = 'PENDING' AND type <> 'YOU_WERE_REMOVED'
                        """,
                reason, Db.utc(clock.instant()), userId, tripId);
    }
}
