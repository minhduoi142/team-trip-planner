package com.tripplanner.trip.dto;

import com.tripplanner.trip.TripRole;
import jakarta.validation.constraints.NotNull;

/** Chỉ nhận EDITOR hoặc VIEWER; chuyển OWNER dùng API transfer-ownership. */
public record ChangeRoleRequest(@NotNull(message = "Chưa chọn quyền") TripRole role) {
}
