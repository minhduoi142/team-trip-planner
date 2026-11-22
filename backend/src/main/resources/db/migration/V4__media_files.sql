-- Upload ảnh từ thiết bị (MinIO/S3). Chỉ lưu key; URL = MINIO_PUBLIC_URL/bucket/object_key (tính lúc trả về).
CREATE TABLE media_files (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    object_key    VARCHAR(200) NOT NULL,
    purpose       VARCHAR(20)  NOT NULL,
    content_type  VARCHAR(50)  NOT NULL,
    size_bytes    INT          NOT NULL,
    width         INT          NULL,
    height        INT          NULL,
    uploaded_by   BIGINT       NULL,
    created_at    DATETIME(6)  NOT NULL,
    CONSTRAINT pk_media_files PRIMARY KEY (id),
    CONSTRAINT uq_media_files_key UNIQUE (object_key),
    CONSTRAINT fk_media_files_user FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_media_purpose CHECK (purpose IN ('TRIP_COVER', 'AVATAR', 'DRESS_CODE')),
    CONSTRAINT chk_media_size CHECK (size_bytes > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
