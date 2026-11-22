package com.tripplanner.room;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.room.dto.RoomDtos.RoomListResponse;
import com.tripplanner.room.dto.RoomDtos.RoomRequest;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Mọi thao tác ghi trả lại toàn bộ danh sách phòng của chuyến. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Rooms", description = "Chia phòng (1 bộ phòng cho cả chuyến)")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class RoomController {

    private final RoomService roomService;

    @GetMapping("/trips/{tripId}/rooms")
    @Operation(summary = "Danh sách phòng + người chưa có phòng (thành viên)")
    public RoomListResponse list(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return roomService.list(tripId, CurrentUser.id(jwt));
    }

    @PostMapping("/trips/{tripId}/rooms")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Thêm phòng (EDITOR+)")
    public RoomListResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                   @Valid @RequestBody RoomRequest request) {
        return roomService.create(tripId, CurrentUser.id(jwt), request);
    }

    @PutMapping("/rooms/{roomId}")
    @Operation(summary = "Sửa phòng; không giảm sức chứa dưới số người đang ở (EDITOR+)")
    public RoomListResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long roomId,
                                   @Valid @RequestBody RoomRequest request) {
        return roomService.update(roomId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/rooms/{roomId}")
    @Operation(summary = "Xóa phòng; người trong phòng về chưa có phòng (EDITOR+)")
    public RoomListResponse delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long roomId) {
        return roomService.delete(roomId, CurrentUser.id(jwt));
    }

    @PutMapping("/rooms/{roomId}/members/{userId}")
    @Operation(summary = "Vào phòng (chính mình) hoặc xếp hộ (EDITOR+); tự chuyển nếu đang ở phòng khác")
    public RoomListResponse assign(@AuthenticationPrincipal Jwt jwt, @PathVariable Long roomId,
                                   @PathVariable Long userId) {
        return roomService.assign(roomId, userId, CurrentUser.id(jwt));
    }

    @DeleteMapping("/rooms/{roomId}/members/{userId}")
    @Operation(summary = "Ra khỏi phòng (chính mình / EDITOR+)")
    public RoomListResponse unassign(@AuthenticationPrincipal Jwt jwt, @PathVariable Long roomId,
                                     @PathVariable Long userId) {
        return roomService.unassign(roomId, userId, CurrentUser.id(jwt));
    }
}
