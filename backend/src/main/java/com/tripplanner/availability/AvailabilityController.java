package com.tripplanner.availability;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.availability.dto.AvailabilityMatrixResponse;
import com.tripplanner.availability.dto.TripLengthRequest;
import com.tripplanner.availability.dto.UpdateAvailabilityRequest;
import com.tripplanner.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips/{tripId}")
@RequiredArgsConstructor
@Tag(name = "Availability", description = "Lịch rảnh theo ngày và gợi ý ngày đi")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    @GetMapping("/availabilities")
    @Operation(summary = "Ma trận lịch rảnh + thống kê theo ngày + Top 3 gợi ý (thành viên)")
    public AvailabilityMatrixResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return availabilityService.getMatrix(tripId, CurrentUser.id(jwt));
    }

    @PutMapping("/availabilities")
    @Operation(summary = "Cập nhật hàng loạt lịch của chính mình (mọi thành viên); status null = xóa")
    public AvailabilityMatrixResponse updateMine(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                                 @Valid @RequestBody UpdateAvailabilityRequest request) {
        return availabilityService.updateMine(tripId, CurrentUser.id(jwt), request);
    }

    @PatchMapping("/trip-length")
    @Operation(summary = "Đặt số ngày muốn đi 1–14 để tính gợi ý (OWNER, EDITOR)")
    public AvailabilityMatrixResponse setTripLength(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                                    @Valid @RequestBody TripLengthRequest request) {
        return availabilityService.setTripLength(tripId, CurrentUser.id(jwt), request.days());
    }
}
