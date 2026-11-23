package com.tripplanner.notification;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * Chuyển thời gian cho truy vấn JdbcTemplate. Cột DATETIME lưu giờ UTC (Hibernate dùng
 * {@code hibernate.jdbc.time_zone=UTC}); JDBC thuần thì truyền/đọc {@link LocalDateTime} theo UTC để Connector/J
 * không tự đổi múi giờ theo JVM.
 */
final class Db {

    private Db() {
    }

    static LocalDateTime utc(Instant instant) {
        return instant == null ? null : LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    static Instant instant(LocalDateTime utc) {
        return utc == null ? null : utc.toInstant(ZoneOffset.UTC);
    }
}
