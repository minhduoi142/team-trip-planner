package com.tripplanner.notification;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.notification.dto.NotificationDtos.NotificationPrefsRequest;
import com.tripplanner.notification.dto.NotificationDtos.NotificationSettingsResponse;
import com.tripplanner.notification.dto.NotificationDtos.NotifyEmailRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Email nhận thông báo, tuỳ chọn, mail thử")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class NotificationSettingsController {

    private final NotificationSettingsService settingsService;
    private final EmailVerificationService verificationService;

    @GetMapping("/notification-settings")
    @Operation(summary = "Email nhận thông báo + tuỳ chọn bật/tắt từng loại")
    public NotificationSettingsResponse settings(@AuthenticationPrincipal Jwt jwt) {
        return settingsService.settings(CurrentUser.id(jwt));
    }

    @PutMapping("/notification-settings")
    @Operation(summary = "Lưu tuỳ chọn nhận email")
    public NotificationSettingsResponse updatePrefs(@AuthenticationPrincipal Jwt jwt,
                                                    @Valid @RequestBody NotificationPrefsRequest request) {
        return settingsService.updatePrefs(CurrentUser.id(jwt), request);
    }

    @PostMapping("/notify-email")
    @Operation(summary = "Đặt email nhận thông báo: gửi link xác minh (email Google của chính mình thì xác minh ngay)")
    public NotificationSettingsResponse requestEmail(@AuthenticationPrincipal Jwt jwt,
                                                     @Valid @RequestBody NotifyEmailRequest request) {
        Long userId = CurrentUser.id(jwt);
        verificationService.requestEmail(userId, request.email());
        return settingsService.settings(userId);
    }

    @DeleteMapping("/notify-email")
    @Operation(summary = "Gỡ email nhận thông báo và huỷ yêu cầu xác minh đang chờ")
    public NotificationSettingsResponse removeEmail(@AuthenticationPrincipal Jwt jwt) {
        Long userId = CurrentUser.id(jwt);
        verificationService.remove(userId);
        return settingsService.settings(userId);
    }

    @PostMapping("/notify-email/test")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Gửi 1 mail thử tới email nhận thông báo (tối đa 1 lần/phút)")
    public void sendTest(@AuthenticationPrincipal Jwt jwt) {
        settingsService.sendTestEmail(CurrentUser.id(jwt));
    }
}
