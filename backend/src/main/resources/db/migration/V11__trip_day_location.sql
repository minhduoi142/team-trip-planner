-- Dự báo thời tiết (docs/sdd-weather.md, Phase W2): vị trí riêng của "Ngày N" (chuyến đi nhiều nơi).
-- Bỏ trống = theo vị trí của chuyến. Gắn vào ngày nên đi theo ngày khi mở chốt/chốt lại, giống lịch trình.
ALTER TABLE trip_days
    ADD COLUMN place_name VARCHAR(150) NULL,
    ADD COLUMN place_lat DECIMAL(7, 5) NULL,
    ADD COLUMN place_lon DECIMAL(8, 5) NULL,
    ADD CONSTRAINT chk_trip_days_place CHECK (
        (place_name IS NULL AND place_lat IS NULL AND place_lon IS NULL)
        OR (place_name IS NOT NULL AND place_lat BETWEEN -90 AND 90 AND place_lon BETWEEN -180 AND 180));
