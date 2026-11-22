-- Wishlist đề xuất địa điểm (docs/sdd-proposals.md)
-- "Đã lên lịch" = itinerary_item_id IS NOT NULL (không có cột status). Số tim tính bằng COUNT, không lưu.
-- Xóa hoạt động trong lịch trình → SET NULL → đề xuất tự quay về wishlist.
CREATE TABLE trip_proposals (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    trip_id            BIGINT        NOT NULL,
    title              VARCHAR(150)  NOT NULL,
    category           VARCHAR(20)   NOT NULL,
    maps_url           VARCHAR(2000) NULL,
    reference_url      VARCHAR(2000) NULL,      -- TikTok / Facebook / Instagram…
    estimated_cost     BIGINT        NULL,      -- VND
    note               VARCHAR(500)  NULL,
    itinerary_item_id  BIGINT        NULL,
    created_by         BIGINT        NULL,
    created_at         DATETIME(6)   NOT NULL,
    updated_at         DATETIME(6)   NOT NULL,
    CONSTRAINT pk_trip_proposals PRIMARY KEY (id),
    CONSTRAINT fk_proposals_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_proposals_item FOREIGN KEY (itinerary_item_id) REFERENCES itinerary_items (id) ON DELETE SET NULL,
    CONSTRAINT uq_proposals_item UNIQUE (itinerary_item_id),
    CONSTRAINT fk_proposals_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_proposals_category CHECK (category IN
        ('FOOD', 'SIGHTSEEING', 'TRANSPORT', 'STAY', 'SHOPPING', 'ACTIVITY', 'OTHER')),
    CONSTRAINT chk_proposals_cost CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    INDEX idx_proposals_trip (trip_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Không lưu trip_id (phụ thuộc bắc cầu qua proposal); "phải là thành viên" do service kiểm tra.
CREATE TABLE proposal_votes (
    proposal_id  BIGINT      NOT NULL,
    user_id      BIGINT      NOT NULL,
    voted_at     DATETIME(6) NOT NULL,
    CONSTRAINT pk_proposal_votes PRIMARY KEY (proposal_id, user_id),
    CONSTRAINT fk_pvotes_proposal FOREIGN KEY (proposal_id) REFERENCES trip_proposals (id) ON DELETE CASCADE,
    CONSTRAINT fk_pvotes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
