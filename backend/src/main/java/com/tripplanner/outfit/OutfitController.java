package com.tripplanner.outfit;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.outfit.dto.OutfitDtos.OutfitBoardResponse;
import com.tripplanner.outfit.dto.OutfitDtos.OutfitRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Outfit từng ngày. Mọi thao tác trả lại toàn bộ bảng outfit của chuyến. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Outfits", description = "Outfit dự định của từng thành viên cho từng ngày")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class OutfitController {

    private final OutfitService outfitService;

    @GetMapping("/trips/{tripId}/outfits")
    @Operation(summary = "Outfit của mọi người, mọi ngày (thành viên)")
    public OutfitBoardResponse board(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return outfitService.board(tripId, CurrentUser.id(jwt));
    }

    @PutMapping("/trip-days/{dayId}/outfits/me")
    @Operation(summary = "Tạo hoặc thay outfit của mình cho ngày này (gửi đủ trường)")
    public OutfitBoardResponse saveMine(@AuthenticationPrincipal Jwt jwt, @PathVariable Long dayId,
                                        @Valid @RequestBody OutfitRequest request) {
        return outfitService.saveMine(dayId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/trip-days/{dayId}/outfits/me")
    @Operation(summary = "Gỡ outfit của mình (idempotent)")
    public OutfitBoardResponse deleteMine(@AuthenticationPrincipal Jwt jwt, @PathVariable Long dayId) {
        return outfitService.deleteMine(dayId, CurrentUser.id(jwt));
    }

    @DeleteMapping("/trip-days/{dayId}/outfits/{userId}")
    @Operation(summary = "Gỡ outfit của một thành viên (OWNER)")
    public OutfitBoardResponse deleteOf(@AuthenticationPrincipal Jwt jwt, @PathVariable Long dayId,
                                        @PathVariable Long userId) {
        return outfitService.deleteOf(dayId, userId, CurrentUser.id(jwt));
    }
}
