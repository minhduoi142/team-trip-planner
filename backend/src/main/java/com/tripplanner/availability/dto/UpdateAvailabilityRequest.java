package com.tripplanner.availability.dto;

import com.tripplanner.availability.AvailabilityStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

/** Cập nhật lịch của CHÍNH MÌNH. {@code status} null = xóa (về "chưa khai"). */
public record UpdateAvailabilityRequest(
        @NotEmpty(message = "Chưa có ngày nào để cập nhật")
        @Size(max = 62, message = "Tối đa 62 ngày mỗi lần cập nhật")
        List<@Valid Entry> entries) {

    public record Entry(
            @NotNull(message = "Thiếu ngày") LocalDate date,
            AvailabilityStatus status) {
    }
}
