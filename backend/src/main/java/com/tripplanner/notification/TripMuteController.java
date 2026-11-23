package com.tripplanner.notification;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.notification.dto.NotificationDtos.TripMuteRequest;
import com.tripplanner.notification.dto.NotificationDtos.TripMuteResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips/{tripId}/notification-mute")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Email nhận thông báo, tuỳ chọn, mail thử")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class TripMuteController {

    private final TripMuteService muteService;

    @GetMapping
    @Operation(summary = "Mình đã tắt email của chuyến này chưa (VIEWER+)")
    public TripMuteResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return muteService.get(tripId, CurrentUser.id(jwt));
    }

    @PutMapping
    @Operation(summary = "Tắt/bật mọi email của chuyến này cho mình (VIEWER+); tắt thì huỷ các email đang chờ")
    public TripMuteResponse set(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                @Valid @RequestBody TripMuteRequest request) {
        return muteService.set(tripId, CurrentUser.id(jwt), request.muted());
    }
}
