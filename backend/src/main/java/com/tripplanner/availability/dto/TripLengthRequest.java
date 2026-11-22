package com.tripplanner.availability.dto;

import jakarta.validation.constraints.NotNull;

/** Khoảng 1–14 được kiểm ở service để trả mã lỗi INVALID_TRIP_LENGTH. */
public record TripLengthRequest(@NotNull(message = "Chưa nhập số ngày") Integer days) {
}
