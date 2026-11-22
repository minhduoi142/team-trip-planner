package com.tripplanner.itinerary.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Ghi chú ngày + dress code. Gửi đủ trường của form; null/rỗng = xóa. Màu: tối đa 4 key của bảng màu. */
public record UpdateDayRequest(
        @Size(max = 500, message = "Ghi chú ngày tối đa 500 ký tự")
        String note,

        @Size(max = 100, message = "Chủ đề tối đa 100 ký tự")
        String dressTheme,

        @Size(max = 500, message = "Ghi chú dress code tối đa 500 ký tự")
        String dressNote,

        @Size(max = 2000, message = "Link ảnh quá dài")
        @Pattern(regexp = "^$|^https?://.+", message = "Link ảnh phải bắt đầu bằng http:// hoặc https://")
        String dressImageUrl,

        List<String> dressColors) {
}
