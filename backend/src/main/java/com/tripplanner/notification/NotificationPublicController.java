package com.tripplanner.notification;

import com.tripplanner.notification.dto.NotificationDtos.UnsubscribeRequest;
import com.tripplanner.notification.dto.NotificationDtos.UnsubscribeResponse;
import com.tripplanner.notification.dto.NotificationDtos.VerifyEmailRequest;
import com.tripplanner.notification.dto.NotificationDtos.VerifyEmailResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Endpoint public mở từ link trong email (người dùng có thể chưa đăng nhập trên thiết bị đó). */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications (public)", description = "Xác minh email và huỷ nhận từ link trong email")
public class NotificationPublicController {

    private final EmailVerificationService verificationService;
    private final NotificationSettingsService settingsService;

    @PostMapping("/verify-email")
    @Operation(summary = "Xác minh email nhận thông báo bằng token trong link")
    public VerifyEmailResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return new VerifyEmailResponse(verificationService.verify(request.token()));
    }

    @PostMapping("/unsubscribe")
    @Operation(summary = "Huỷ nhận email theo token trong link (mọi email / 1 loại / 1 chuyến)")
    public UnsubscribeResponse unsubscribe(@Valid @RequestBody UnsubscribeRequest request) {
        return settingsService.unsubscribe(request.token());
    }

    /** RFC 8058: hộp thư POST form {@code List-Unsubscribe=One-Click}, token nằm trên query string. */
    @PostMapping("/unsubscribe/one-click")
    @Operation(summary = "Huỷ nhận 1 chạm (nút \"Huỷ đăng ký\" của Gmail/Outlook, header List-Unsubscribe)")
    public ResponseEntity<Void> unsubscribeOneClick(@RequestParam("token") String token) {
        settingsService.unsubscribe(token);
        return ResponseEntity.ok().build();
    }
}
