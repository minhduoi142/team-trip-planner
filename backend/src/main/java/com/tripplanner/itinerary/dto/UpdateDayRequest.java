package com.tripplanner.itinerary.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

/**
 * Ghi chú ngày + dress code + vị trí riêng của ngày. Gửi đủ trường của form; null/rỗng = xóa. Màu: tối đa 4 key
 * của bảng màu. Vị trí: {@code placeName} + tọa độ (chọn từ gợi ý /geo/search) cả ba hoặc không; không có = theo
 * vị trí của chuyến.
 */
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

        List<String> dressColors,
        @Size(max = 150, message = "Tên địa điểm tối đa 150 ký tự")
        String placeName,
        BigDecimal placeLat,
        BigDecimal placeLon) {
}
