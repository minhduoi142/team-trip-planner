-- Phase 1: users, trips, trip_members (BCNF)

CREATE TABLE users (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    google_sub        VARCHAR(255)  NULL,
    email             VARCHAR(255)  NULL,
    username          VARCHAR(30)   NULL,
    password_hash     VARCHAR(100)  NULL,
    display_name      VARCHAR(100)  NOT NULL,
    avatar_url        VARCHAR(1000) NULL,
    created_at        DATETIME(6)   NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_google_sub UNIQUE (google_sub),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT chk_users_login_method CHECK (
        google_sub IS NOT NULL OR (username IS NOT NULL AND password_hash IS NOT NULL)
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE trips (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    title               VARCHAR(150)  NOT NULL,
    destination         VARCHAR(150)  NULL,
    description         TEXT          NULL,
    cover_image_url     VARCHAR(2000) NULL,
    invite_code         VARCHAR(12)   NOT NULL,
    planned_start_date  DATE          NULL,
    planned_end_date    DATE          NULL,
    start_date          DATE          NULL,
    end_date            DATE          NULL,
    drive_folder_url    VARCHAR(2000) NULL,
    created_by          BIGINT        NOT NULL,
    created_at          DATETIME(6)   NOT NULL,
    updated_at          DATETIME(6)   NOT NULL,
    CONSTRAINT pk_trips PRIMARY KEY (id),
    CONSTRAINT uq_trips_invite_code UNIQUE (invite_code),
    CONSTRAINT fk_trips_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT chk_trips_planned_range CHECK (
        planned_start_date IS NULL OR planned_end_date IS NULL OR planned_end_date >= planned_start_date
    ),
    CONSTRAINT chk_trips_range CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_trips_locked_pair CHECK ((start_date IS NULL) = (end_date IS NULL))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE trip_members (
    trip_id        BIGINT      NOT NULL,
    user_id        BIGINT      NOT NULL,
    role           VARCHAR(10) NOT NULL,
    joined_at      DATETIME(6) NOT NULL,
    -- = trip_id khi role là OWNER, NULL khi khác: UNIQUE bảo đảm mỗi trip chỉ có 1 OWNER
    owner_trip_id  BIGINT GENERATED ALWAYS AS (CASE WHEN role = 'OWNER' THEN trip_id END) STORED,
    CONSTRAINT pk_trip_members PRIMARY KEY (trip_id, user_id),
    CONSTRAINT fk_trip_members_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_trip_members_role CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER')),
    CONSTRAINT uq_trip_single_owner UNIQUE (owner_trip_id),
    INDEX idx_trip_members_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
