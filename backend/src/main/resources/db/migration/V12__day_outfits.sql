-- Outfit từng ngày (docs/sdd-golden-hour-outfit.md phần B). Không lưu trip_id (suy ra qua trip_days → phụ thuộc
-- bắc cầu, như poll_votes); "phải là thành viên" do service kiểm tra, rời nhóm thì service xóa outfit.

CREATE TABLE day_outfits (
    trip_day_id  BIGINT       NOT NULL,
    user_id      BIGINT       NOT NULL,
    note         VARCHAR(300) NULL,
    updated_at   DATETIME(6)  NOT NULL,
    CONSTRAINT pk_day_outfits PRIMARY KEY (trip_day_id, user_id),
    CONSTRAINT fk_outfits_day FOREIGN KEY (trip_day_id) REFERENCES trip_days (id) ON DELETE CASCADE,
    CONSTRAINT fk_outfits_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_outfits_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- 0..4 ảnh theo thứ tự (thuộc tính đa trị → bảng riêng)
CREATE TABLE day_outfit_photos (
    trip_day_id  BIGINT        NOT NULL,
    user_id      BIGINT        NOT NULL,
    position     TINYINT       NOT NULL,
    image_url    VARCHAR(2000) NOT NULL,
    CONSTRAINT pk_outfit_photos PRIMARY KEY (trip_day_id, user_id, position),
    CONSTRAINT fk_outfit_photos FOREIGN KEY (trip_day_id, user_id)
        REFERENCES day_outfits (trip_day_id, user_id) ON DELETE CASCADE,
    CONSTRAINT chk_outfit_photo_pos CHECK (position BETWEEN 0 AND 3)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- 0..3 tông màu, key thuộc bảng màu dress code (TripDayDressColor.PALETTE)
CREATE TABLE day_outfit_colors (
    trip_day_id  BIGINT      NOT NULL,
    user_id      BIGINT      NOT NULL,
    color_key    VARCHAR(20) NOT NULL,
    CONSTRAINT pk_outfit_colors PRIMARY KEY (trip_day_id, user_id, color_key),
    CONSTRAINT fk_outfit_colors FOREIGN KEY (trip_day_id, user_id)
        REFERENCES day_outfits (trip_day_id, user_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Ảnh outfit tải lên MinIO
ALTER TABLE media_files DROP CHECK chk_media_purpose,
    ADD CONSTRAINT chk_media_purpose CHECK (purpose IN ('TRIP_COVER', 'AVATAR', 'DRESS_CODE', 'RECEIPT', 'OUTFIT'));
