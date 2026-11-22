package com.tripplanner.checklist.dto;

import jakarta.validation.constraints.NotNull;

public record CheckRequest(@NotNull(message = "Thiếu trạng thái") Boolean checked) {
}
