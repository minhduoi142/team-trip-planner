package com.tripplanner.trip.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Dùng cho cả tạo (POST) và sửa (PATCH) chuyến đi. Khi sửa, FE gửi đủ các trường của form:
 * trường null/rỗng = xóa giá trị đó (trừ {@code title} bắt buộc).
 * Khoảng ngày dự kiến: nhập cả hai hoặc bỏ trống cả hai.
 */
public record TripRequest(
        @NotBlank(message = "Tên chuyến đi không được để trống")
        @Size(max = 150, message = "Tên chuyến đi tối đa 150 ký tự")
        String title,

        @Size(max = 150, message = "Điểm đến tối đa 150 ký tự")
        String destination,

        @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự")
        String description,

        /** URL ảnh http(s), hoặc ảnh bìa mặc định dạng {@code preset:<key>} (FE tự vẽ). */
        @Size(max = 2000, message = "Link ảnh bìa quá dài")
        @Pattern(regexp = "^$|^https?://.+|^preset:[a-z0-9-]{1,30}$",
                message = "Link ảnh bìa phải bắt đầu bằng http:// hoặc https://")
        String coverImageUrl,

        LocalDate plannedStartDate,

        LocalDate plannedEndDate) {
}
