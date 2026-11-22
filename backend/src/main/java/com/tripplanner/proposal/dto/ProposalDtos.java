package com.tripplanner.proposal.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.tripplanner.itinerary.ItineraryCategory;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** DTO (record) của wishlist đề xuất, gom 1 file vì đều nhỏ. Xem docs/sdd-proposals.md mục 3.2. */
public final class ProposalDtos {

    private ProposalDtos() {
    }

    public record ProposalRequest(
            @NotBlank(message = "Tên đề xuất không được để trống")
            @Size(max = 150, message = "Tên đề xuất tối đa 150 ký tự")
            String title,

            @NotNull(message = "Chưa chọn loại")
            ItineraryCategory category,

            @Size(max = 2000, message = "Link quá dài")
            @Pattern(regexp = "^$|^https?://.+", message = "Link Google Maps phải bắt đầu bằng http:// hoặc https://")
            String mapsUrl,

            @Size(max = 2000, message = "Link quá dài")
            @Pattern(regexp = "^$|^https?://.+", message = "Link tham khảo phải bắt đầu bằng http:// hoặc https://")
            String referenceUrl,

            @PositiveOrZero(message = "Chi phí không được âm")
            @Max(value = 1_000_000_000L, message = "Chi phí tối đa 1 tỷ")
            Long estimatedCost,

            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
            String note) {
    }

    /** Đưa vào lịch trình. Có endTime thì phải có startTime (kiểm ở ItineraryService). */
    public record ScheduleProposalRequest(
            @NotNull(message = "Chưa chọn ngày") Long dayId,
            @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @JsonFormat(pattern = "HH:mm") LocalTime endTime,
            @NotNull(message = "Chưa chọn loại hoạt động") ItineraryCategory category) {
    }

    /** Hoạt động đã tạo từ đề xuất. date null nếu trip đã mở lại khảo sát hoặc là ngày thừa. */
    public record ScheduledInfo(
            Long itemId,
            Long dayId,
            int dayIndex,
            LocalDate date,
            @JsonFormat(pattern = "HH:mm") LocalTime startTime) {
    }

    public record ProposalResponse(
            Long id,
            String title,
            ItineraryCategory category,
            String mapsUrl,
            String referenceUrl,
            Long estimatedCost,
            String note,
            String createdByName,
            Instant createdAt,
            int voteCount,
            List<Long> voterIds,
            boolean votedByMe,
            boolean canEdit,
            boolean canDelete,
            ScheduledInfo scheduled) {
    }

    /** Chưa lên lịch trước (nhiều tim nhất trước), đã lên lịch sau (theo ngày, giờ). */
    public record ProposalListResponse(
            boolean canSchedule,
            boolean tripLocked,
            List<ProposalResponse> proposals) {
    }
}
