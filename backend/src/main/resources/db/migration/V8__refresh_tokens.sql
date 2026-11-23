-- Refresh token rotation + reuse detection + token family (docs/sdd-refresh-token.md)
-- user_id chỉ ở family (token → family → user: không lặp ở token để giữ BCNF).
-- Không có parent_id tự tham chiếu: chuỗi token dài sẽ vượt giới hạn cascade 15 tầng của MySQL.

CREATE TABLE refresh_token_families (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    user_id        BIGINT       NOT NULL,
    created_at     DATETIME(6)  NOT NULL,
    last_used_at   DATETIME(6)  NOT NULL,
    revoked_at     DATETIME(6)  NULL,
    revoke_reason  VARCHAR(20)  NULL,
    user_agent     VARCHAR(255) NULL,
    CONSTRAINT pk_rt_families PRIMARY KEY (id),
    CONSTRAINT fk_rt_families_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_rt_families_revoke CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL)),
    CONSTRAINT chk_rt_families_reason CHECK (revoke_reason IS NULL OR
        revoke_reason IN ('LOGOUT', 'LOGOUT_ALL', 'REUSE_DETECTED')),
    INDEX idx_rt_families_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE refresh_tokens (
    id           BIGINT      NOT NULL AUTO_INCREMENT,
    family_id    BIGINT      NOT NULL,
    token_hash   CHAR(64)    NOT NULL,      -- SHA-256 hex, KHÔNG lưu token gốc
    issued_at    DATETIME(6) NOT NULL,
    expires_at   DATETIME(6) NOT NULL,
    consumed_at  DATETIME(6) NULL,          -- NULL = token hiện hành của họ
    CONSTRAINT pk_refresh_tokens PRIMARY KEY (id),
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_family FOREIGN KEY (family_id)
        REFERENCES refresh_token_families (id) ON DELETE CASCADE,
    INDEX idx_refresh_tokens_family (family_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin;  -- hash so sánh chính xác
