-- Quỹ chung (docs/sdd-trip-fund.md). Dựng trên chi tiêu/thanh toán đã có:
--   nộp quỹ  = settlement thành viên → thủ quỹ, kind = 'FUND'
--   chi quỹ  = expense paid_by = thủ quỹ, from_fund = TRUE
-- Số dư quỹ / số đã nộp của từng người KHÔNG lưu (tính khi đọc).

-- Tối đa 1 quỹ / chuyến. Thủ quỹ phải là thành viên (FK tổ hợp, không cascade: TripService.delete xóa quỹ trước
-- thành viên; loại thủ quỹ khỏi nhóm bị chặn ở service).
CREATE TABLE trip_funds (
    trip_id            BIGINT       NOT NULL,
    treasurer_id       BIGINT       NOT NULL,
    per_person_target  BIGINT       NOT NULL,
    note               VARCHAR(300) NULL,
    created_at         DATETIME(6)  NOT NULL,
    updated_at         DATETIME(6)  NOT NULL,
    CONSTRAINT pk_trip_funds PRIMARY KEY (trip_id),
    CONSTRAINT fk_funds_treasurer FOREIGN KEY (trip_id, treasurer_id) REFERENCES trip_members (trip_id, user_id),
    CONSTRAINT chk_funds_target CHECK (per_person_target BETWEEN 1000 AND 100000000)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

ALTER TABLE settlements
    ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'DEBT' AFTER amount,
    ADD CONSTRAINT chk_settlements_kind CHECK (kind IN ('DEBT', 'FUND'));

ALTER TABLE expenses
    ADD COLUMN from_fund BOOLEAN NOT NULL DEFAULT FALSE AFTER paid_by;
