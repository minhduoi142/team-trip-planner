-- Dự báo thời tiết (docs/sdd-weather.md, Phase W1): tọa độ điểm đến của chuyến, chọn từ gợi ý geocoding.
-- Cả hai cùng có hoặc cùng trống. Không lưu dự báo (dữ liệu dẫn xuất, chỉ cache trong bộ nhớ).
ALTER TABLE trips
    ADD COLUMN destination_lat DECIMAL(7, 5) NULL AFTER destination,
    ADD COLUMN destination_lon DECIMAL(8, 5) NULL AFTER destination_lat,
    ADD CONSTRAINT chk_trips_destination_coords CHECK (
        (destination_lat IS NULL AND destination_lon IS NULL)
        OR (destination_lat BETWEEN -90 AND 90 AND destination_lon BETWEEN -180 AND 180));
