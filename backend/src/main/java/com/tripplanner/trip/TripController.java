package com.tripplanner.trip;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.trip.dto.InviteCodeResponse;
import com.tripplanner.trip.dto.InvitePreviewResponse;
import com.tripplanner.trip.dto.JoinTripResponse;
import com.tripplanner.trip.dto.TripDetailResponse;
import com.tripplanner.trip.dto.TripRequest;
import com.tripplanner.trip.dto.TripSummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips")
@RequiredArgsConstructor
@Tag(name = "Trips", description = "Chuyến đi, mã mời và tham gia nhóm")
public class TripController {

    private final TripService tripService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Tạo chuyến đi (người tạo thành OWNER)")
    @SecurityRequirement(name = OpenApiConfig.BEARER)
    public TripDetailResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody TripRequest request) {
        return tripService.create(CurrentUser.id(jwt), request);
    }

    @GetMapping
    @Operation(summary = "Danh sách chuyến đi mình tham gia")
    @SecurityRequirement(name = OpenApiConfig.BEARER)
    public List<TripSummaryResponse> listMine(@AuthenticationPrincipal Jwt jwt) {
        return tripService.listMine(CurrentUser.id(jwt));
    }

    @GetMapping("/{tripId}")
    @Operation(summary = "Chi tiết chuyến đi + thành viên (thành viên mới xem được)")
    @SecurityRequirement(name = OpenApiConfig.BEARER)
    public TripDetailResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return tripService.get(tripId, CurrentUser.id(jwt));
    }

    @PatchMapping("/{tripId}")
    @Operation(summary = "Sửa thông tin chuyến đi (OWNER, EDITOR)")
    @SecurityRequirement(name = OpenApiConfig.BEARER)
    public TripDetailResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                     @Valid @RequestBody TripRequest request) {
        return tripService.update(tripId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/{tripId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Xóa chuyến đi (OWNER)")
    @SecurityRequirement(name = OpenApiConfig.BEARER)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        tripService.delete(tripId, CurrentUser.id(jwt));
    }

    @PostMapping("/{tripId}/invite-code/regenerate")
    @Operation(summary = "Tạo mã mời mới, mã cũ hết hiệu lực (OWNER)")
    @SecurityRequirement(name = OpenApiConfig.BEARER)
    public InviteCodeResponse regenerateInviteCode(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return tripService.regenerateInviteCode(tripId, CurrentUser.id(jwt));
    }

    @GetMapping("/invite/{code}")
    @Operation(summary = "Xem trước chuyến đi từ mã mời (public)")
    public InvitePreviewResponse previewInvite(@PathVariable String code) {
        return tripService.previewInvite(code);
    }

    @PostMapping("/join/{code}")
    @Operation(summary = "Tham gia chuyến đi bằng mã mời (idempotent)")
    @SecurityRequirement(name = OpenApiConfig.BEARER)
    public JoinTripResponse join(@AuthenticationPrincipal Jwt jwt, @PathVariable String code) {
        return tripService.join(code, CurrentUser.id(jwt));
    }
}
