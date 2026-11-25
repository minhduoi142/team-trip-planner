package com.tripplanner.trip.dto;

import com.tripplanner.trip.TripRole;
import com.tripplanner.trip.TripStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** {@code inviteCode} chỉ trả cho OWNER/EDITOR; VIEWER nhận null. */
public record TripDetailResponse(
        Long id,
        String title,
        String destination,
        /** Tọa độ điểm đến; null nếu chưa chọn vị trí từ gợi ý (khi đó không có thời tiết). */
        BigDecimal destinationLat,
        BigDecimal destinationLon,
        String description,
        String coverImageUrl,
        TripStatus status,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        LocalDate startDate,
        LocalDate endDate,
        String inviteCode,
        TripRole myRole,
        int memberCount,
        Instant createdAt,
        /** Link thư mục Google Drive chung (Phase 5); null nếu chưa gắn */
        String driveFolderUrl,
        List<TripMemberResponse> members) {
}
