package com.tripplanner.trip;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.trip.dto.ChangeRoleRequest;
import com.tripplanner.trip.dto.TransferOwnershipRequest;
import com.tripplanner.trip.dto.TripMemberResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips/{tripId}")
@RequiredArgsConstructor
@Tag(name = "Trip members", description = "Phân quyền, chuyển trưởng nhóm, xóa/rời nhóm")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class TripMemberController {

    private final TripMemberService memberService;

    @PatchMapping("/members/{userId}")
    @Operation(summary = "Đổi quyền thành viên sang EDITOR/VIEWER (OWNER)")
    public TripMemberResponse changeRole(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                         @PathVariable Long userId, @Valid @RequestBody ChangeRoleRequest request) {
        return memberService.changeRole(tripId, CurrentUser.id(jwt), userId, request.role());
    }

    @PostMapping("/transfer-ownership")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Chuyển quyền trưởng nhóm; người chuyển thành EDITOR (OWNER)")
    public void transferOwnership(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                  @Valid @RequestBody TransferOwnershipRequest request) {
        memberService.transferOwnership(tripId, CurrentUser.id(jwt), request.userId());
    }

    @DeleteMapping("/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "OWNER xóa thành viên, hoặc tự rời nhóm (userId = chính mình)")
    public void removeMember(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId, @PathVariable Long userId) {
        memberService.removeMember(tripId, CurrentUser.id(jwt), userId);
    }
}
