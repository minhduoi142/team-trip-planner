package com.tripplanner.poll.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.tripplanner.itinerary.ItineraryCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;

/** DTO (record) của package poll, gom 1 file vì đều nhỏ. */
public final class PollDtos {

    private PollDtos() {
    }

    public record OptionRequest(
            @NotBlank(message = "Tên lựa chọn không được để trống")
            @Size(max = 150, message = "Tên lựa chọn tối đa 150 ký tự")
            String name,

            @Size(max = 2000, message = "Link quá dài")
            @Pattern(regexp = "^$|^https?://.+", message = "Link Google Maps phải bắt đầu bằng http:// hoặc https://")
            String mapsUrl,

            @Size(max = 300, message = "Ghi chú tối đa 300 ký tự")
            String note) {
    }

    public record CreatePollRequest(
            @NotBlank(message = "Câu hỏi không được để trống")
            @Size(max = 150, message = "Câu hỏi tối đa 150 ký tự")
            String title,

            @Size(max = 20, message = "Tối đa 20 lựa chọn ban đầu")
            List<@Valid OptionRequest> options) {
    }

    /** Thêm kết quả vào lịch trình khi chốt. */
    public record AddToItinerary(
            @NotNull(message = "Chưa chọn ngày") Long dayId,
            @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @NotNull(message = "Chưa chọn loại hoạt động") ItineraryCategory category) {
    }

    public record ClosePollRequest(
            @NotNull(message = "Chưa chọn lựa chọn thắng") Long optionId,
            @Valid AddToItinerary addToItinerary) {
    }

    public record OptionResponse(
            Long id,
            String name,
            String mapsUrl,
            String note,
            String createdByName,
            int voteCount,
            List<Long> voterIds,
            boolean votedByMe,
            boolean canDelete) {
    }

    public record PollResponse(
            Long id,
            String title,
            String createdByName,
            Instant createdAt,
            boolean closed,
            Instant closedAt,
            Long winningOptionId,
            boolean canManage,
            List<OptionResponse> options) {
    }

    /** Đang mở xếp trước, rồi mới nhất trước. */
    public record PollListResponse(List<PollResponse> polls) {
    }
}
