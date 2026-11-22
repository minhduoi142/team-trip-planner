package com.tripplanner.checklist;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.checklist.dto.CheckRequest;
import com.tripplanner.checklist.dto.ChecklistItemRequest;
import com.tripplanner.checklist.dto.ChecklistResponse;
import com.tripplanner.config.OpenApiConfig;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Mọi thao tác ghi đều trả lại toàn bộ checklist. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Checklist", description = "Danh sách đồ cần chuẩn bị của cả nhóm")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class ChecklistController {

    private final ChecklistService checklistService;

    @GetMapping("/trips/{tripId}/checklist")
    @Operation(summary = "Danh sách + thống kê (thành viên)")
    public ChecklistResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return checklistService.get(tripId, CurrentUser.id(jwt));
    }

    @PostMapping("/trips/{tripId}/checklist")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Thêm món (EDITOR+)")
    public ChecklistResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                    @Valid @RequestBody ChecklistItemRequest request) {
        return checklistService.create(tripId, CurrentUser.id(jwt), request);
    }

    @PutMapping("/checklist-items/{itemId}")
    @Operation(summary = "Sửa món, kể cả đổi người mang (EDITOR+)")
    public ChecklistResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long itemId,
                                    @Valid @RequestBody ChecklistItemRequest request) {
        return checklistService.update(itemId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/checklist-items/{itemId}")
    @Operation(summary = "Xóa món (EDITOR+)")
    public ChecklistResponse delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long itemId) {
        return checklistService.delete(itemId, CurrentUser.id(jwt));
    }

    @PostMapping("/checklist-items/{itemId}/claim")
    @Operation(summary = "\"Tôi mang\": nhận món chưa có ai nhận (mọi thành viên)")
    public ChecklistResponse claim(@AuthenticationPrincipal Jwt jwt, @PathVariable Long itemId) {
        return checklistService.claim(itemId, CurrentUser.id(jwt));
    }

    @DeleteMapping("/checklist-items/{itemId}/claim")
    @Operation(summary = "Bỏ nhận món của mình")
    public ChecklistResponse unclaim(@AuthenticationPrincipal Jwt jwt, @PathVariable Long itemId) {
        return checklistService.unclaim(itemId, CurrentUser.id(jwt));
    }

    @PatchMapping("/checklist-items/{itemId}/check")
    @Operation(summary = "Tick đã chuẩn bị (người mang hoặc EDITOR+)")
    public ChecklistResponse check(@AuthenticationPrincipal Jwt jwt, @PathVariable Long itemId,
                                   @Valid @RequestBody CheckRequest request) {
        return checklistService.check(itemId, CurrentUser.id(jwt), request.checked());
    }
}
