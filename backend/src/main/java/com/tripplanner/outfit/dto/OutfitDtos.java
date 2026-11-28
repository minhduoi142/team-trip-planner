package com.tripplanner.outfit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

/** DTO (record) của package outfit (docs/sdd-golden-hour-outfit.md B.3), gom 1 file. */
public final class OutfitDtos {

    private OutfitDtos() {
    }

    /**
     * Gửi đủ trường (thay toàn bộ outfit). Ảnh theo thứ tự hiển thị; màu là key của bảng màu dress code (kiểm ở
     * service, sai → INVALID_DRESS_COLOR). Cả ba đều rỗng → 400.
     */
    public record OutfitRequest(
            @Size(max = 4, message = "Tối đa 4 ảnh")
            List<@NotBlank(message = "Link ảnh trống")
                 @Size(max = 2000, message = "Link ảnh quá dài")
                 @Pattern(regexp = "^https?://.+", message = "Link ảnh phải bắt đầu bằng http:// hoặc https://")
                 String> photoUrls,
            @Size(max = 3, message = "Chọn tối đa 3 màu")
            List<String> colors,
            @Size(max = 300, message = "Ghi chú tối đa 300 ký tự")
            String note) {
    }

    /** {@code canDelete}: của mình, hoặc mình là OWNER. */
    public record OutfitResponse(
            Long userId,
            String displayName,
            String avatarUrl,
            List<String> photoUrls,
            List<String> colors,
            String note,
            Instant updatedAt,
            boolean mine,
            boolean canDelete) {
    }

    /** Outfit của mình đứng đầu, rồi theo updatedAt mới nhất. */
    public record DayOutfitsResponse(Long dayId, int dayIndex, List<OutfitResponse> outfits) {
    }

    /** Mọi ngày của chuyến theo dayIndex, kể cả ngày chưa có outfit. */
    public record OutfitBoardResponse(List<DayOutfitsResponse> days) {
    }
}
