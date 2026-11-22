package com.tripplanner.itinerary;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.itinerary.dto.ItineraryItemRequest;
import com.tripplanner.itinerary.dto.ItineraryResponse;
import com.tripplanner.itinerary.dto.MoveItemRequest;
import com.tripplanner.itinerary.dto.ReorderItemsRequest;
import com.tripplanner.itinerary.dto.UpdateDayRequest;
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

/** Mọi thao tác ghi đều trả lại toàn bộ lịch trình để FE thay cache một lần. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Itinerary", description = "Lịch trình theo ngày, dress code, kéo thả")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class ItineraryController {

    private final ItineraryService itineraryService;

    @GetMapping("/trips/{tripId}/itinerary")
    @Operation(summary = "Toàn bộ ngày + dress code + hoạt động + tổng chi phí (thành viên)")
    public ItineraryResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return itineraryService.get(tripId, CurrentUser.id(jwt));
    }

    @PostMapping("/trip-days/{dayId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Thêm hoạt động, tự chèn theo giờ (EDITOR+)")
    public ItineraryResponse addItem(@AuthenticationPrincipal Jwt jwt, @PathVariable Long dayId,
                                     @Valid @RequestBody ItineraryItemRequest request) {
        return itineraryService.addItem(dayId, CurrentUser.id(jwt), request);
    }

    @PutMapping("/itinerary-items/{itemId}")
    @Operation(summary = "Sửa hoạt động; đổi giờ thì tự chèn lại (EDITOR+)")
    public ItineraryResponse updateItem(@AuthenticationPrincipal Jwt jwt, @PathVariable Long itemId,
                                        @Valid @RequestBody ItineraryItemRequest request) {
        return itineraryService.updateItem(itemId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/itinerary-items/{itemId}")
    @Operation(summary = "Xóa hoạt động (EDITOR+)")
    public ItineraryResponse deleteItem(@AuthenticationPrincipal Jwt jwt, @PathVariable Long itemId) {
        return itineraryService.deleteItem(itemId, CurrentUser.id(jwt));
    }

    @PutMapping("/trip-days/{dayId}/items/order")
    @Operation(summary = "Kéo thả trong ngày: đặt thứ tự mới cho đúng tập item của ngày (EDITOR+)")
    public ItineraryResponse reorder(@AuthenticationPrincipal Jwt jwt, @PathVariable Long dayId,
                                     @Valid @RequestBody ReorderItemsRequest request) {
        return itineraryService.reorder(dayId, CurrentUser.id(jwt), request.itemIds());
    }

    @PostMapping("/itinerary-items/{itemId}/move")
    @Operation(summary = "Chuyển hoạt động sang ngày khác cùng chuyến, tự chèn theo giờ (EDITOR+)")
    public ItineraryResponse move(@AuthenticationPrincipal Jwt jwt, @PathVariable Long itemId,
                                  @Valid @RequestBody MoveItemRequest request) {
        return itineraryService.move(itemId, CurrentUser.id(jwt), request.dayId());
    }

    @PutMapping("/trip-days/{dayId}")
    @Operation(summary = "Sửa ghi chú ngày + dress code (EDITOR+)")
    public ItineraryResponse updateDay(@AuthenticationPrincipal Jwt jwt, @PathVariable Long dayId,
                                       @Valid @RequestBody UpdateDayRequest request) {
        return itineraryService.updateDay(dayId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/trip-days/{dayId}")
    @Operation(summary = "Xóa ngày thừa cùng nội dung của nó (EDITOR+)")
    public ItineraryResponse deleteOverflowDay(@AuthenticationPrincipal Jwt jwt, @PathVariable Long dayId) {
        return itineraryService.deleteOverflowDay(dayId, CurrentUser.id(jwt));
    }
}
