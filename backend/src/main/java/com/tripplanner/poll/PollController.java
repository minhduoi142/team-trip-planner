package com.tripplanner.poll;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.poll.dto.PollDtos.ClosePollRequest;
import com.tripplanner.poll.dto.PollDtos.CreatePollRequest;
import com.tripplanner.poll.dto.PollDtos.OptionRequest;
import com.tripplanner.poll.dto.PollDtos.PollListResponse;
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

/** Mọi thao tác ghi trả lại toàn bộ bình chọn của chuyến. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Polls", description = "Bình chọn quán / chỗ chơi")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class PollController {

    private final PollService pollService;

    @GetMapping("/trips/{tripId}/polls")
    @Operation(summary = "Danh sách bình chọn (thành viên)")
    public PollListResponse list(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return pollService.list(tripId, CurrentUser.id(jwt));
    }

    @PostMapping("/trips/{tripId}/polls")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Tạo bình chọn (EDITOR+)")
    public PollListResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                   @Valid @RequestBody CreatePollRequest request) {
        return pollService.create(tripId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/polls/{pollId}")
    @Operation(summary = "Xóa bình chọn (người tạo / EDITOR+)")
    public PollListResponse delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long pollId) {
        return pollService.delete(pollId, CurrentUser.id(jwt));
    }

    @PostMapping("/polls/{pollId}/options")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Thêm lựa chọn (mọi thành viên, khi đang mở)")
    public PollListResponse addOption(@AuthenticationPrincipal Jwt jwt, @PathVariable Long pollId,
                                      @Valid @RequestBody OptionRequest request) {
        return pollService.addOption(pollId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/poll-options/{optionId}")
    @Operation(summary = "Xóa lựa chọn (người thêm / EDITOR+, khi đang mở)")
    public PollListResponse deleteOption(@AuthenticationPrincipal Jwt jwt, @PathVariable Long optionId) {
        return pollService.deleteOption(optionId, CurrentUser.id(jwt));
    }

    @PutMapping("/poll-options/{optionId}/vote")
    @Operation(summary = "Vote (idempotent)")
    public PollListResponse vote(@AuthenticationPrincipal Jwt jwt, @PathVariable Long optionId) {
        return pollService.vote(optionId, CurrentUser.id(jwt));
    }

    @DeleteMapping("/poll-options/{optionId}/vote")
    @Operation(summary = "Bỏ vote")
    public PollListResponse unvote(@AuthenticationPrincipal Jwt jwt, @PathVariable Long optionId) {
        return pollService.unvote(optionId, CurrentUser.id(jwt));
    }

    @PostMapping("/polls/{pollId}/close")
    @Operation(summary = "Chốt bình chọn, có thể thêm kết quả vào lịch trình (người tạo / EDITOR+)")
    public PollListResponse close(@AuthenticationPrincipal Jwt jwt, @PathVariable Long pollId,
                                  @Valid @RequestBody ClosePollRequest request) {
        return pollService.close(pollId, CurrentUser.id(jwt), request);
    }

    @PostMapping("/polls/{pollId}/reopen")
    @Operation(summary = "Mở lại bình chọn (người tạo / EDITOR+)")
    public PollListResponse reopen(@AuthenticationPrincipal Jwt jwt, @PathVariable Long pollId) {
        return pollService.reopen(pollId, CurrentUser.id(jwt));
    }
}
