package com.tripplanner.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/** DTO thông báo email (docs/sdd-email-notifications.md §5). FE copy 1:1 vào types/notification.ts. */
public final class NotificationDtos {

    private NotificationDtos() {
    }

    public record NotificationPrefsRequest(
            @NotNull Boolean emailEnabled,
            @NotNull Boolean countdownEnabled,
            @NotNull Boolean memberEnabled,
            @NotNull Boolean expenseEnabled) {
    }

    /**
     * @param notifyEmail      email đã xác minh, null = chưa có
     * @param pendingEmail     email đang chờ xác minh (null nếu không có hoặc đã hết hạn)
     * @param mailConfigured   máy chủ đã đặt MAIL_HOST chưa
     */
    public record NotificationSettingsResponse(
            String notifyEmail,
            String pendingEmail,
            Instant pendingExpiresAt,
            boolean mailConfigured,
            boolean emailEnabled,
            boolean countdownEnabled,
            boolean memberEnabled,
            boolean expenseEnabled) {
    }

    public record NotifyEmailRequest(
            @NotBlank(message = "Nhập email")
            @Size(max = 254, message = "Email tối đa 254 ký tự")
            @Email(regexp = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message = "Email không hợp lệ")
            String email) {
    }

    public record VerifyEmailRequest(@NotBlank String token) {
    }

    public record VerifyEmailResponse(String email) {
    }

    public record UnsubscribeRequest(@NotBlank String token) {
    }

    /**
     * @param scope     "ALL" | "CATEGORY" | "TRIP"
     * @param category  "COUNTDOWN" | "MEMBER" | "EXPENSE" khi scope = CATEGORY, ngược lại null
     * @param tripTitle tên chuyến khi scope = TRIP (null nếu chuyến đã bị xoá)
     */
    public record UnsubscribeResponse(String scope, String category, String tripTitle) {
    }

    /** Tắt/bật email của 1 chuyến (mọi loại, kể cả đếm ngược). */
    public record TripMuteRequest(@NotNull Boolean muted) {
    }

    public record TripMuteResponse(boolean muted) {
    }
}
