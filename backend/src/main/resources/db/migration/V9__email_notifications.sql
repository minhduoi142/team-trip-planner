-- Thông báo qua email (docs/sdd-email-notifications.md). Toàn bộ schema cho Phase N1–N3.

-- 1) Email nhận thông báo, luôn là email ĐÃ XÁC MINH (bởi Google hoặc qua link).
--    Tách khỏi users.email (email đăng nhập Google, dùng để tự liên kết) → không ảnh hưởng logic đăng nhập.
--    Không UNIQUE: 2 tài khoản có thể dùng chung 1 hộp thư.
ALTER TABLE users ADD COLUMN notify_email VARCHAR(254) NULL;

-- Tài khoản Google hiện có: email Google đã được Google xác minh
UPDATE users SET notify_email = email WHERE email IS NOT NULL;

-- 2) Email đang chờ xác minh: tối đa 1 yêu cầu / user. Chỉ lưu SHA-256 của token.
CREATE TABLE email_verifications (
    user_id       BIGINT       NOT NULL,
    email         VARCHAR(254) NOT NULL,
    token_hash    CHAR(64)     NOT NULL,
    expires_at    DATETIME(6)  NOT NULL,
    last_sent_at  DATETIME(6)  NOT NULL,
    send_date     DATE         NOT NULL,   -- ngày (giờ VN) của bộ đếm send_count
    send_count    TINYINT      NOT NULL,   -- số mail xác minh đã gửi trong send_date (giới hạn 5)
    CONSTRAINT pk_email_verifications PRIMARY KEY (user_id),
    CONSTRAINT uq_email_verifications_token UNIQUE (token_hash),
    CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 3) Tuỳ chọn. Không có dòng = mọi thứ bật.
CREATE TABLE user_notification_prefs (
    user_id            BIGINT      NOT NULL,
    email_enabled      BOOLEAN     NOT NULL,   -- công tắc tổng ("Tắt mọi email")
    countdown_enabled  BOOLEAN     NOT NULL,
    member_enabled     BOOLEAN     NOT NULL,
    expense_enabled    BOOLEAN     NOT NULL,
    updated_at         DATETIME(6) NOT NULL,
    CONSTRAINT pk_user_notification_prefs PRIMARY KEY (user_id),
    CONSTRAINT fk_user_notification_prefs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 4) Tắt thông báo theo chuyến. Có dòng = đã tắt. Rời nhóm thì tự xoá (CASCADE như member_availabilities).
CREATE TABLE trip_notification_mutes (
    trip_id     BIGINT      NOT NULL,
    user_id     BIGINT      NOT NULL,
    created_at  DATETIME(6) NOT NULL,
    CONSTRAINT pk_trip_notification_mutes PRIMARY KEY (trip_id, user_id),
    CONSTRAINT fk_trip_notification_mutes_member FOREIGN KEY (trip_id, user_id)
        REFERENCES trip_members (trip_id, user_id) ON DELETE CASCADE
);

-- 5) Outbox: 1 dòng = 1 sự kiện cho 1 người nhận. category/channel suy ra từ type (không lưu).
CREATE TABLE notifications (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    user_id       BIGINT        NOT NULL,
    trip_id       BIGINT        NULL,
    type          VARCHAR(30)   NOT NULL,
    payload       JSON          NOT NULL,   -- ảnh chụp dữ liệu lúc xảy ra sự kiện (tên, số tiền…)
    dedup_key     VARCHAR(150)  NULL,       -- idempotent vĩnh viễn (đếm ngược)
    coalesce_key  VARCHAR(100)  NULL,       -- gộp/sửa/huỷ trong cửa sổ chờ (khoản chi, chuyển khoản)
    status        VARCHAR(12)   NOT NULL,
    send_after    DATETIME(6)   NOT NULL,
    attempts      TINYINT       NOT NULL DEFAULT 0,
    last_error    VARCHAR(500)  NULL,
    claimed_at    DATETIME(6)   NULL,
    sent_at       DATETIME(6)   NULL,
    created_at    DATETIME(6)   NOT NULL,
    updated_at    DATETIME(6)   NOT NULL,
    CONSTRAINT pk_notifications PRIMARY KEY (id),
    CONSTRAINT uq_notifications_dedup UNIQUE (dedup_key),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT chk_notifications_status CHECK (status IN
        ('PENDING', 'SENDING', 'SENT', 'SKIPPED', 'CANCELLED', 'FAILED')),
    CONSTRAINT chk_notifications_type CHECK (type IN
        ('COUNTDOWN',
         'MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_REMOVED', 'YOU_WERE_REMOVED',
         'EXPENSE_ADDED', 'EXPENSE_UPDATED', 'EXPENSE_DELETED',
         'SETTLEMENT_PENDING', 'SETTLEMENT_CONFIRMED', 'SETTLEMENT_REJECTED')),
    INDEX idx_notifications_due (status, send_after),
    INDEX idx_notifications_group (user_id, trip_id, status),
    INDEX idx_notifications_coalesce (coalesce_key, user_id)
);
