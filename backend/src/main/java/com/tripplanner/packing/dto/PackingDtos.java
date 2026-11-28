package com.tripplanner.packing.dto;

import com.tripplanner.packing.PackingCategory;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

/** DTO (record) của package packing (docs/sdd-packing-list.md mục 3.2), gom 1 file. */
public final class PackingDtos {

    private PackingDtos() {
    }

    /** {@code quantity} null = 1. */
    public record PackingItemRequest(
            @NotBlank(message = "Nhập tên món")
            @Size(max = 150, message = "Tên món tối đa 150 ký tự")
            String itemName,
            @NotNull(message = "Chọn nhóm")
            PackingCategory category,
            @Min(value = 1, message = "Số lượng từ 1 đến 99")
            @Max(value = 99, message = "Số lượng từ 1 đến 99")
            Integer quantity) {
    }

    public record PackedRequest(@NotNull(message = "Thiếu trạng thái đã xếp") Boolean packed) {
    }

    public record PackingItemResponse(
            Long id,
            String itemName,
            PackingCategory category,
            int quantity,
            boolean packed,
            Instant createdAt) {
    }

    /**
     * Danh sách của chính người gọi: theo nhóm (thứ tự enum) rồi lúc thêm. {@code addedCount}: số món vừa thêm
     * (chỉ có nghĩa với lệnh thêm từ mẫu; lệnh khác = 0).
     */
    public record PackingListResponse(List<PackingItemResponse> items, int total, int packedCount, int addedCount) {
    }

    public record TemplateItemResponse(String itemName, PackingCategory category, int quantity) {
    }

    public record PackingTemplateResponse(String key, String label, List<TemplateItemResponse> items) {
    }
}
