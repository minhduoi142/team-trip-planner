package com.tripplanner.trip.dto;

import jakarta.validation.constraints.NotNull;

public record TransferOwnershipRequest(@NotNull(message = "Chưa chọn thành viên nhận quyền") Long userId) {
}
