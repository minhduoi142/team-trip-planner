package com.tripplanner.tripday.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record LockDateRequest(
        @NotNull(message = "Chưa chọn ngày bắt đầu") LocalDate startDate,
        @NotNull(message = "Chưa chọn ngày kết thúc") LocalDate endDate) {
}
