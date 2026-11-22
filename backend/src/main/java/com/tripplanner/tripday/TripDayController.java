package com.tripplanner.tripday;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.trip.dto.TripDetailResponse;
import com.tripplanner.tripday.dto.LockDateRequest;
import com.tripplanner.tripday.dto.TripDayResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips/{tripId}")
@RequiredArgsConstructor
@Tag(name = "Trip days", description = "Chốt ngày đi và danh sách các ngày của chuyến")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class TripDayController {

    private final TripDayService tripDayService;

    @PatchMapping("/lock-date")
    @Operation(summary = "Chốt ngày chính thức và tự sinh trip_days (OWNER)")
    public TripDetailResponse lock(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                   @Valid @RequestBody LockDateRequest request) {
        return tripDayService.lock(tripId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/lock-date")
    @Operation(summary = "Mở lại khảo sát: xóa ngày chính thức và trip_days, giữ lịch rảnh (OWNER)")
    public TripDetailResponse unlock(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return tripDayService.unlock(tripId, CurrentUser.id(jwt));
    }

    @GetMapping("/days")
    @Operation(summary = "Danh sách các ngày đi (rỗng nếu chưa chốt)")
    public List<TripDayResponse> days(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return tripDayService.list(tripId, CurrentUser.id(jwt));
    }
}
