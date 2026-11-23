package com.tripplanner.notification;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Nạp người nhận cho listener thông báo bằng JDBC thuần (không qua repository JPA): lỗi đọc ở đây không đánh dấu
 * transaction nghiệp vụ là rollback-only. Listener chạy BEFORE_COMMIT, lúc Hibernate có thể CHƯA flush (thành viên
 * vừa vào / vừa xoá) → listener luôn tự loại người trong cuộc theo id, không dựa vào trạng thái bảng.
 */
@Component
public class NotificationAudience {

    private final NamedParameterJdbcTemplate jdbc;

    public NotificationAudience(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Person(long id, String displayName, String notifyEmail) {
    }

    record Prefs(boolean email, boolean countdown, boolean member, boolean expense) {

        static final Prefs DEFAULT = new Prefs(true, true, true, true);

        boolean allows(NotificationCategory category) {
            return email && switch (category) {
                case COUNTDOWN -> countdown;
                case MEMBER -> member;
                case EXPENSE -> expense;
            };
        }
    }

    /** Ảnh chụp những người liên quan tới 1 sự kiện trong 1 chuyến. */
    public record Snapshot(String tripTitle, List<Long> memberIds, Map<Long, Person> people,
                           Map<Long, Prefs> prefs, Set<Long> muted) {

        public String name(long userId) {
            Person person = people.get(userId);
            return person == null ? "Ai đó" : person.displayName();
        }

        /** Có email đã xác minh, bật loại này, và (trừ YOU_WERE_REMOVED) không tắt email chuyến. */
        public boolean canReceive(long userId, NotificationType type) {
            Person person = people.get(userId);
            if (person == null || person.notifyEmail() == null) {
                return false;
            }
            if (!prefs.getOrDefault(userId, Prefs.DEFAULT).allows(type.category())) {
                return false;
            }
            return !type.respectsTripMute() || !muted.contains(userId);
        }
    }

    /**
     * @param withMembers   có nạp danh sách thành viên hiện tại (trong DB) không
     * @param extraUserIds  người cần tên/email ngoài thành viên (người vừa rời, người thao tác…)
     */
    public Snapshot load(long tripId, boolean withMembers, Collection<Long> extraUserIds) {
        MapSqlParameterSource trip = new MapSqlParameterSource("tripId", tripId);
        List<String> titles = jdbc.queryForList("SELECT title FROM trips WHERE id = :tripId", trip, String.class);
        List<Long> memberIds = withMembers
                ? jdbc.queryForList("SELECT user_id FROM trip_members WHERE trip_id = :tripId ORDER BY joined_at",
                trip, Long.class)
                : List.of();

        Set<Long> ids = new LinkedHashSet<>(memberIds);
        ids.addAll(extraUserIds);
        Map<Long, Person> people = new HashMap<>();
        Map<Long, Prefs> prefs = new HashMap<>();
        if (!ids.isEmpty()) {
            MapSqlParameterSource users = new MapSqlParameterSource("ids", ids);
            jdbc.query("SELECT id, display_name, notify_email FROM users WHERE id IN (:ids)", users,
                    rs -> {
                        people.put(rs.getLong("id"), new Person(rs.getLong("id"), rs.getString("display_name"),
                                rs.getString("notify_email")));
                    });
            jdbc.query("""
                            SELECT user_id, email_enabled, countdown_enabled, member_enabled, expense_enabled
                            FROM user_notification_prefs WHERE user_id IN (:ids)
                            """, users,
                    rs -> {
                        prefs.put(rs.getLong("user_id"), new Prefs(rs.getBoolean("email_enabled"),
                                rs.getBoolean("countdown_enabled"), rs.getBoolean("member_enabled"),
                                rs.getBoolean("expense_enabled")));
                    });
        }
        Set<Long> muted = new HashSet<>(jdbc.queryForList(
                "SELECT user_id FROM trip_notification_mutes WHERE trip_id = :tripId", trip, Long.class));
        return new Snapshot(titles.isEmpty() ? null : titles.get(0), memberIds, people, prefs, muted);
    }
}
