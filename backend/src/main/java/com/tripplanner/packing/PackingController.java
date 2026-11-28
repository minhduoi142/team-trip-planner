package com.tripplanner.packing;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.packing.dto.PackingDtos.PackedRequest;
import com.tripplanner.packing.dto.PackingDtos.PackingItemRequest;
import com.tripplanner.packing.dto.PackingDtos.PackingListResponse;
import com.tripplanner.packing.dto.PackingDtos.PackingTemplateResponse;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Hành lý cá nhân: chỉ chính chủ xem/sửa. Mọi thao tác ghi trả lại toàn bộ danh sách của người gọi. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Packing", description = "Hành lý cá nhân (riêng tư) + danh sách mẫu")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class PackingController {

    private final PackingService packingService;

    @GetMapping("/trips/{tripId}/packing")
    @Operation(summary = "Hành lý của chính mình trong chuyến")
    public PackingListResponse list(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return packingService.list(tripId, CurrentUser.id(jwt));
    }

    @PostMapping("/trips/{tripId}/packing")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Thêm 1 món (tối đa 200 món/người/chuyến)")
    public PackingListResponse add(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                   @Valid @RequestBody PackingItemRequest request) {
        return packingService.add(tripId, CurrentUser.id(jwt), request);
    }

    @PostMapping("/trips/{tripId}/packing/templates/{key}")
    @Operation(summary = "Thêm cả danh sách mẫu, bỏ món trùng tên (không phân biệt dấu)")
    public PackingListResponse addTemplate(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                           @PathVariable String key) {
        return packingService.addTemplate(tripId, CurrentUser.id(jwt), key);
    }

    @PutMapping("/packing-items/{itemId}")
    @Operation(summary = "Sửa tên, nhóm, số lượng (món của mình)")
    public PackingListResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long itemId,
                                      @Valid @RequestBody PackingItemRequest request) {
        return packingService.update(itemId, CurrentUser.id(jwt), request);
    }

    @PatchMapping("/packing-items/{itemId}/packed")
    @Operation(summary = "Tích / bỏ tích đã xếp")
    public PackingListResponse setPacked(@AuthenticationPrincipal Jwt jwt, @PathVariable Long itemId,
                                         @Valid @RequestBody PackedRequest request) {
        return packingService.setPacked(itemId, CurrentUser.id(jwt), request.packed());
    }

    @DeleteMapping("/packing-items/{itemId}")
    @Operation(summary = "Xóa món (của mình)")
    public PackingListResponse delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long itemId) {
        return packingService.delete(itemId, CurrentUser.id(jwt));
    }

    @GetMapping("/packing-templates")
    @Operation(summary = "Các danh sách mẫu (tĩnh)")
    public List<PackingTemplateResponse> templates() {
        return packingService.templates();
    }
}
