package com.tripplanner.itinerary.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/** Thứ tự mới cho ĐÚNG tập item hiện có của ngày. */
public record ReorderItemsRequest(@NotNull(message = "Thiếu danh sách hoạt động") List<Long> itemIds) {
}
