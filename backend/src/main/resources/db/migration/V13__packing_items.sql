-- Hành lý cá nhân (docs/sdd-packing-list.md): danh sách riêng tư của từng thành viên trong từng chuyến.
-- FK tổ hợp → trip_members ON DELETE CASCADE: rời nhóm / bị loại / xóa chuyến → hành lý của người đó tự xóa.
CREATE TABLE packing_items (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id     BIGINT       NOT NULL,
    user_id     BIGINT       NOT NULL,
    category    VARCHAR(20)  NOT NULL,
    item_name   VARCHAR(150) NOT NULL,
    quantity    SMALLINT     NOT NULL DEFAULT 1,
    is_packed   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT pk_packing_items PRIMARY KEY (id),
    CONSTRAINT fk_packing_member FOREIGN KEY (trip_id, user_id)
        REFERENCES trip_members (trip_id, user_id) ON DELETE CASCADE,
    CONSTRAINT chk_packing_category CHECK (category IN
        ('CLOTHES', 'BEAUTY', 'DOCUMENTS', 'ELECTRONICS', 'HEALTH', 'OTHER')),
    CONSTRAINT chk_packing_quantity CHECK (quantity BETWEEN 1 AND 99),
    INDEX idx_packing_owner (trip_id, user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
