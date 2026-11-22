package com.tripplanner.itinerary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.tripplanner.itinerary.ItineraryCategory;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalTime;

/** Thêm/sửa hoạt động. Giờ dạng "HH:mm"; có endTime thì phải có startTime (kiểm ở service). */
public record ItineraryItemRequest(
        @NotBlank(message = "Tên hoạt động không được để trống")
        @Size(max = 150, message = "Tên hoạt động tối đa 150 ký tự")
        String title,

        @NotNull(message = "Chưa chọn loại hoạt động")
        ItineraryCategory category,

        @JsonFormat(pattern = "HH:mm")
        LocalTime startTime,

        @JsonFormat(pattern = "HH:mm")
        LocalTime endTime,

        @Size(max = 200, message = "Tên địa điểm tối đa 200 ký tự")
        String locationName,

        @Size(max = 2000, message = "Link quá dài")
        @Pattern(regexp = "^$|^https?://.+", message = "Link Google Maps phải bắt đầu bằng http:// hoặc https://")
        String mapsUrl,

        @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
        String note,

        @PositiveOrZero(message = "Chi phí không được âm")
        @Max(value = 1_000_000_000L, message = "Chi phí tối đa 1 tỷ")
        Long estimatedCost) {
}
