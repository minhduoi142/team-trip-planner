package com.tripplanner.itinerary.dto;

import jakarta.validation.constraints.NotNull;

public record MoveItemRequest(@NotNull(message = "Chưa chọn ngày") Long dayId) {
}
