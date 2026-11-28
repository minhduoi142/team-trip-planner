-- Ví giấy tờ chuyến đi (docs/sdd-trip-documents.md). File nằm ở bucket MinIO RIÊNG TƯ, chỉ lưu key.
-- Không lưu trip_day_id: ngày suy ra từ starts_at + ngày đi (lưu sẽ là phụ thuộc bắc cầu và sai khi đổi ngày chốt).
CREATE TABLE trip_documents (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    trip_id        BIGINT        NOT NULL,
    kind           VARCHAR(20)   NOT NULL,
    title          VARCHAR(150)  NOT NULL,
    booking_code   VARCHAR(50)   NULL,
    starts_at      DATETIME      NULL,      -- giờ địa phương nơi đến, không múi giờ (giờ bay / nhận phòng)
    ends_at        DATETIME      NULL,      -- giờ hạ cánh / trả phòng
    place          VARCHAR(150)  NULL,
    contact_name   VARCHAR(100)  NULL,
    contact_phone  VARCHAR(20)   NULL,
    note           VARCHAR(500)  NULL,
    visibility     VARCHAR(10)   NOT NULL,
    file_key       VARCHAR(200)  NULL,
    file_type      VARCHAR(50)   NULL,
    file_name      VARCHAR(150)  NULL,
    file_size      INT           NULL,
    created_by     BIGINT        NULL,
    created_at     DATETIME(6)   NOT NULL,
    updated_at     DATETIME(6)   NOT NULL,
    CONSTRAINT pk_trip_documents PRIMARY KEY (id),
    CONSTRAINT fk_documents_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_documents_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_documents_kind CHECK (kind IN
        ('FLIGHT', 'BUS_TRAIN', 'STAY', 'TICKET', 'INSURANCE', 'ID', 'OTHER')),
    CONSTRAINT chk_documents_visibility CHECK (visibility IN ('SHARED', 'PRIVATE')),
    CONSTRAINT chk_documents_file CHECK (
        (file_key IS NULL AND file_type IS NULL AND file_name IS NULL AND file_size IS NULL)
        OR (file_key IS NOT NULL AND file_type IS NOT NULL AND file_name IS NOT NULL AND file_size IS NOT NULL)),
    CONSTRAINT chk_documents_time CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
    INDEX idx_documents_trip (trip_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
