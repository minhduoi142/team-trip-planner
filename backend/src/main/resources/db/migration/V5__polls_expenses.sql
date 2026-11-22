-- Phase 4: bình chọn, chi tiêu, thanh toán, tài khoản ngân hàng (BCNF; xem docs/sdd-phase-4.md mục 2.1)

-- Thông tin ngân hàng: thuộc về user (dùng chung mọi chuyến). Tên ngân hàng suy ra từ BIN → không lưu.
ALTER TABLE users
    ADD COLUMN bank_bin          CHAR(6)     NULL,
    ADD COLUMN bank_account_no   VARCHAR(19) NULL,
    ADD COLUMN bank_account_name VARCHAR(50) NULL,
    ADD CONSTRAINT chk_users_bank CHECK (
        (bank_bin IS NULL AND bank_account_no IS NULL AND bank_account_name IS NULL)
        OR (bank_bin IS NOT NULL AND bank_account_no IS NOT NULL AND bank_account_name IS NOT NULL));

-- Ảnh hóa đơn dùng chung kho MinIO
ALTER TABLE media_files DROP CHECK chk_media_purpose,
    ADD CONSTRAINT chk_media_purpose CHECK (purpose IN ('TRIP_COVER', 'AVATAR', 'DRESS_CODE', 'RECEIPT'));

-- ---------- Bình chọn
CREATE TABLE polls (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id            BIGINT       NOT NULL,
    title              VARCHAR(150) NOT NULL,
    created_by         BIGINT       NULL,
    created_at         DATETIME(6)  NOT NULL,
    closed_at          DATETIME(6)  NULL,      -- NULL = đang mở
    winning_option_id  BIGINT       NULL,
    CONSTRAINT pk_polls PRIMARY KEY (id),
    CONSTRAINT fk_polls_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_polls_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE poll_options (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    poll_id     BIGINT        NOT NULL,
    name        VARCHAR(150)  NOT NULL,
    maps_url    VARCHAR(2000) NULL,
    note        VARCHAR(300)  NULL,
    created_by  BIGINT        NULL,
    created_at  DATETIME(6)   NOT NULL,
    CONSTRAINT pk_poll_options PRIMARY KEY (id),
    CONSTRAINT fk_options_poll FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE,
    CONSTRAINT fk_options_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT uq_options_name UNIQUE (poll_id, name)   -- collation _ai_ci: "Bún bò" = "bun bo"
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

ALTER TABLE polls ADD CONSTRAINT fk_polls_winner
    FOREIGN KEY (winning_option_id) REFERENCES poll_options (id) ON DELETE SET NULL;

CREATE TABLE poll_votes (
    option_id  BIGINT      NOT NULL,
    user_id    BIGINT      NOT NULL,
    voted_at   DATETIME(6) NOT NULL,
    CONSTRAINT pk_poll_votes PRIMARY KEY (option_id, user_id),
    CONSTRAINT fk_votes_option FOREIGN KEY (option_id) REFERENCES poll_options (id) ON DELETE CASCADE,
    CONSTRAINT fk_votes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------- Chi tiêu (VND, số nguyên)
CREATE TABLE expenses (
    id           BIGINT        NOT NULL AUTO_INCREMENT,
    trip_id      BIGINT        NOT NULL,
    title        VARCHAR(150)  NOT NULL,
    category     VARCHAR(20)   NOT NULL,
    amount       BIGINT        NOT NULL,
    paid_by      BIGINT        NOT NULL,
    split_mode   VARCHAR(10)   NOT NULL,     -- EQUAL | CUSTOM (để form sửa hiển thị đúng chế độ)
    spent_on     DATE          NULL,
    note         VARCHAR(500)  NULL,
    receipt_url  VARCHAR(2000) NULL,
    created_by   BIGINT        NULL,
    created_at   DATETIME(6)   NOT NULL,
    updated_at   DATETIME(6)   NOT NULL,
    CONSTRAINT pk_expenses PRIMARY KEY (id),
    CONSTRAINT fk_expenses_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    -- Người trả phải là thành viên của CHÍNH trip này
    CONSTRAINT fk_expenses_payer FOREIGN KEY (trip_id, paid_by) REFERENCES trip_members (trip_id, user_id),
    CONSTRAINT fk_expenses_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_expenses_amount CHECK (amount BETWEEN 1 AND 1000000000),
    CONSTRAINT chk_expenses_split CHECK (split_mode IN ('EQUAL', 'CUSTOM')),
    CONSTRAINT chk_expenses_category CHECK (category IN
        ('FOOD', 'TRANSPORT', 'STAY', 'TICKET', 'SHOPPING', 'OTHER')),
    INDEX idx_expenses_trip (trip_id, spent_on)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE expense_shares (
    expense_id  BIGINT NOT NULL,
    user_id     BIGINT NOT NULL,
    amount      BIGINT NOT NULL,
    CONSTRAINT pk_expense_shares PRIMARY KEY (expense_id, user_id),
    CONSTRAINT fk_shares_expense FOREIGN KEY (expense_id) REFERENCES expenses (id) ON DELETE CASCADE,
    CONSTRAINT fk_shares_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT chk_shares_amount CHECK (amount >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------- Thanh toán giữa các thành viên
CREATE TABLE settlements (
    id            BIGINT      NOT NULL AUTO_INCREMENT,
    trip_id       BIGINT      NOT NULL,
    from_user     BIGINT      NOT NULL,
    to_user       BIGINT      NOT NULL,
    amount        BIGINT      NOT NULL,
    status        VARCHAR(10) NOT NULL,      -- PENDING (người trả báo đã chuyển) | CONFIRMED (người nhận xác nhận)
    created_at    DATETIME(6) NOT NULL,
    confirmed_at  DATETIME(6) NULL,
    CONSTRAINT pk_settlements PRIMARY KEY (id),
    CONSTRAINT fk_settlements_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_settlements_from FOREIGN KEY (trip_id, from_user) REFERENCES trip_members (trip_id, user_id),
    CONSTRAINT fk_settlements_to FOREIGN KEY (trip_id, to_user) REFERENCES trip_members (trip_id, user_id),
    CONSTRAINT chk_settlements_users CHECK (from_user <> to_user),
    CONSTRAINT chk_settlements_amount CHECK (amount BETWEEN 1 AND 1000000000),
    CONSTRAINT chk_settlements_status CHECK (status IN ('PENDING', 'CONFIRMED'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
