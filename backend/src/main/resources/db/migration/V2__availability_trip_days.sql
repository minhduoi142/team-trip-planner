-- Phase 2: lịch rảnh theo ngày, số ngày muốn đi, các ngày đi sau khi chốt (BCNF)

ALTER TABLE trips
    ADD COLUMN trip_length_days TINYINT NULL AFTER end_date,
    ADD CONSTRAINT chk_trips_length CHECK (trip_length_days IS NULL OR trip_length_days BETWEEN 1 AND 14);

-- Mỗi thành viên có tối đa 1 trạng thái cho mỗi ngày. Không có dòng = chưa khai.
CREATE TABLE member_availabilities (
    trip_id     BIGINT      NOT NULL,
    user_id     BIGINT      NOT NULL,
    avail_date  DATE        NOT NULL,
    status      VARCHAR(10) NOT NULL,
    updated_at  DATETIME(6) NOT NULL,
    CONSTRAINT pk_member_availabilities PRIMARY KEY (trip_id, user_id, avail_date),
    -- FK tổ hợp: chỉ thành viên của trip mới khai được; rời nhóm thì lịch rảnh bị xóa theo
    CONSTRAINT fk_availability_member FOREIGN KEY (trip_id, user_id)
        REFERENCES trip_members (trip_id, user_id) ON DELETE CASCADE,
    CONSTRAINT chk_availability_status CHECK (status IN ('AVAILABLE', 'MAYBE', 'BUSY'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Sinh khi Owner chốt ngày; actual_date = trips.start_date + (day_index - 1)
CREATE TABLE trip_days (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id      BIGINT       NOT NULL,
    day_index    SMALLINT     NOT NULL,
    actual_date  DATE         NOT NULL,
    note         VARCHAR(500) NULL,
    CONSTRAINT pk_trip_days PRIMARY KEY (id),
    CONSTRAINT fk_trip_days_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT uq_trip_days_index UNIQUE (trip_id, day_index),
    CONSTRAINT uq_trip_days_date UNIQUE (trip_id, actual_date),
    CONSTRAINT chk_trip_days_index CHECK (day_index >= 1)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
