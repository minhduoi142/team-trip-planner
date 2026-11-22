package com.tripplanner.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Cập nhật hồ sơ. {@code avatarUrl} null hoặc rỗng = xóa avatar.
 */
public record UpdateProfileRequest(
        @NotBlank(message = "Tên hiển thị không được để trống")
        @Size(max = 100, message = "Tên hiển thị tối đa 100 ký tự")
        String displayName,

        @Size(max = 1000, message = "Link avatar quá dài")
        @Pattern(regexp = "^$|^https?://.+", message = "Link avatar phải bắt đầu bằng http:// hoặc https://")
        String avatarUrl) {
}
