-- Phase 3: lịch trình, dress code, checklist; ngày thực của trip_days trở thành dữ liệu suy ra (BCNF)

-- 1) trip_days: ngày thực là dữ liệu suy ra → bỏ actual_date; thêm dress code
ALTER TABLE trip_days
    DROP INDEX uq_trip_days_date,
    DROP COLUMN actual_date,
    ADD COLUMN dress_theme     VARCHAR(100)  NULL,
    ADD COLUMN dress_note      VARCHAR(500)  NULL,
    ADD COLUMN dress_image_url VARCHAR(2000) NULL;

-- Bảng màu dress code (tối đa 4 màu/ngày, kiểm ở service). 1NF: mỗi màu 1 dòng.
CREATE TABLE trip_day_dress_colors (
    trip_day_id BIGINT      NOT NULL,
    color_key   VARCHAR(20) NOT NULL,         -- khóa trong bảng màu cố định ở FE/BE, vd 'white', 'pastel-pink'
    CONSTRAINT pk_dress_colors PRIMARY KEY (trip_day_id, color_key),
    CONSTRAINT fk_dress_colors_day FOREIGN KEY (trip_day_id) REFERENCES trip_days (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- 2) Lịch trình: chỉ tham chiếu trip_day_id (KHÔNG có trip_id, tránh phụ thuộc bắc cầu)
CREATE TABLE itinerary_items (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    trip_day_id     BIGINT        NOT NULL,
    title           VARCHAR(150)  NOT NULL,
    category        VARCHAR(20)   NOT NULL,
    start_time      TIME          NULL,
    end_time        TIME          NULL,
    location_name   VARCHAR(200)  NULL,
    maps_url        VARCHAR(2000) NULL,
    note            VARCHAR(1000) NULL,
    estimated_cost  BIGINT        NULL,       -- VND
    sort_order      INT           NOT NULL,
    created_by      BIGINT        NULL,
    created_at      DATETIME(6)   NOT NULL,
    updated_at      DATETIME(6)   NOT NULL,
    CONSTRAINT pk_itinerary_items PRIMARY KEY (id),
    CONSTRAINT fk_items_day FOREIGN KEY (trip_day_id) REFERENCES trip_days (id) ON DELETE CASCADE,
    CONSTRAINT fk_items_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_items_category CHECK (category IN
        ('FOOD', 'SIGHTSEEING', 'TRANSPORT', 'STAY', 'SHOPPING', 'ACTIVITY', 'OTHER')),
    CONSTRAINT chk_items_time CHECK (end_time IS NULL OR start_time IS NOT NULL),
    CONSTRAINT chk_items_cost CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    INDEX idx_items_day_order (trip_day_id, sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- 3) Checklist: assignee phải là thành viên của chính trip đó → FK tổ hợp
CREATE TABLE trip_checklists (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id     BIGINT       NOT NULL,
    category    VARCHAR(20)  NOT NULL,
    item_name   VARCHAR(150) NOT NULL,
    quantity    SMALLINT     NOT NULL DEFAULT 1,
    assignee_id BIGINT       NULL,
    is_checked  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT pk_trip_checklists PRIMARY KEY (id),
    CONSTRAINT fk_checklist_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    -- Không CASCADE/SET NULL được (SET NULL sẽ null cả trip_id) → ứng dụng tự bỏ giao món trước khi xóa thành viên
    CONSTRAINT fk_checklist_assignee FOREIGN KEY (trip_id, assignee_id)
        REFERENCES trip_members (trip_id, user_id),
    CONSTRAINT chk_checklist_category CHECK (category IN
        ('SHARED', 'FOOD', 'MEDICAL', 'ELECTRONICS', 'PHOTO', 'OTHER')),
    CONSTRAINT chk_checklist_quantity CHECK (quantity BETWEEN 1 AND 99)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- 4) Bổ sung trip_days cho các trip đã chốt nhưng chưa có ngày (vd: dữ liệu seed cũ)
INSERT INTO trip_days (trip_id, day_index)
WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 30)
SELECT t.id, seq.n
FROM trips t JOIN seq ON seq.n <= DATEDIFF(t.end_date, t.start_date) + 1
WHERE t.start_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM trip_days d WHERE d.trip_id = t.id);
