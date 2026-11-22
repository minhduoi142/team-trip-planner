package com.tripplanner.checklist.dto;

import com.tripplanner.checklist.ChecklistCategory;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** {@code quantity} null = 1. {@code assigneeId} null = chưa giao cho ai. */
public record ChecklistItemRequest(
        @NotBlank(message = "Tên món không được để trống")
        @Size(max = 150, message = "Tên món tối đa 150 ký tự")
        String itemName,

        @NotNull(message = "Chưa chọn nhóm đồ")
        ChecklistCategory category,

        @Min(value = 1, message = "Số lượng từ 1 đến 99")
        @Max(value = 99, message = "Số lượng từ 1 đến 99")
        Integer quantity,

        Long assigneeId) {
}
