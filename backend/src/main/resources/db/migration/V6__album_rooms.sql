-- Phase 5: album link Drive, chia phòng (BCNF; xem docs/sdd-phase-5.md mục 2.1)

-- ---------- Album: ảnh/video nổi bật = link Drive (chỉ lưu id file, URL suy ra)
CREATE TABLE album_photos (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id        BIGINT       NOT NULL,
    drive_file_id  VARCHAR(100) NOT NULL,
    caption        VARCHAR(300) NULL,
    added_by       BIGINT       NULL,
    created_at     DATETIME(6)  NOT NULL,
    CONSTRAINT pk_album_photos PRIMARY KEY (id),
    CONSTRAINT fk_album_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_album_added_by FOREIGN KEY (added_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT uq_album_file UNIQUE (trip_id, drive_file_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin;  -- id Drive phân biệt hoa thường

-- Gắn ảnh với 1 ngày đi (tùy chọn). Tách bảng: nếu đặt trip_day_id trong album_photos thì
-- trip_day_id → trip_id là phụ thuộc bắc cầu (vi phạm BCNF).
CREATE TABLE album_photo_days (
    photo_id     BIGINT NOT NULL,
    trip_day_id  BIGINT NOT NULL,
    CONSTRAINT pk_album_photo_days PRIMARY KEY (photo_id),
    CONSTRAINT fk_photo_days_photo FOREIGN KEY (photo_id) REFERENCES album_photos (id) ON DELETE CASCADE,
    CONSTRAINT fk_photo_days_day FOREIGN KEY (trip_day_id) REFERENCES trip_days (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------- Chia phòng (1 bộ phòng cho cả chuyến)
CREATE TABLE trip_rooms (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id     BIGINT       NOT NULL,
    name        VARCHAR(100) NOT NULL,
    capacity    TINYINT      NULL,            -- NULL = không giới hạn
    note        VARCHAR(300) NULL,
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT pk_trip_rooms PRIMARY KEY (id),
    CONSTRAINT fk_rooms_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT uq_rooms_name UNIQUE (trip_id, name),
    CONSTRAINT chk_rooms_capacity CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 30)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- BCNF: (room_id, user_id), không lưu trip_id (suy ra qua room). "Mỗi người tối đa 1 phòng/chuyến"
-- và "phải là thành viên" do service kiểm tra trong cùng transaction.
CREATE TABLE room_assignments (
    room_id      BIGINT      NOT NULL,
    user_id      BIGINT      NOT NULL,
    assigned_at  DATETIME(6) NOT NULL,
    CONSTRAINT pk_room_assignments PRIMARY KEY (room_id, user_id),
    CONSTRAINT fk_assign_room FOREIGN KEY (room_id) REFERENCES trip_rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_assign_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
