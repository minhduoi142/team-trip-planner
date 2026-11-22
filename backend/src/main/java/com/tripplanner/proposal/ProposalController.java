package com.tripplanner.proposal;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.proposal.dto.ProposalDtos.ProposalListResponse;
import com.tripplanner.proposal.dto.ProposalDtos.ProposalRequest;
import com.tripplanner.proposal.dto.ProposalDtos.ScheduleProposalRequest;
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

/** Mọi thao tác trả lại toàn bộ wishlist của chuyến. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Proposals", description = "Wishlist đề xuất địa điểm + thả tim + đưa vào lịch trình")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class ProposalController {

    private final ProposalService proposalService;

    @GetMapping("/trips/{tripId}/proposals")
    @Operation(summary = "Wishlist của chuyến (thành viên)")
    public ProposalListResponse list(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return proposalService.list(tripId, CurrentUser.id(jwt));
    }

    @PostMapping("/trips/{tripId}/proposals")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Thêm đề xuất (mọi thành viên)")
    public ProposalListResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                       @Valid @RequestBody ProposalRequest request) {
        return proposalService.create(tripId, CurrentUser.id(jwt), request);
    }

    @PutMapping("/proposals/{proposalId}")
    @Operation(summary = "Sửa đề xuất (người tạo / OWNER)")
    public ProposalListResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long proposalId,
                                       @Valid @RequestBody ProposalRequest request) {
        return proposalService.update(proposalId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/proposals/{proposalId}")
    @Operation(summary = "Xóa đề xuất (người tạo / OWNER); hoạt động đã tạo trong lịch trình vẫn giữ")
    public ProposalListResponse delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long proposalId) {
        return proposalService.delete(proposalId, CurrentUser.id(jwt));
    }

    @PutMapping("/proposals/{proposalId}/vote")
    @Operation(summary = "Thả tim (idempotent)")
    public ProposalListResponse vote(@AuthenticationPrincipal Jwt jwt, @PathVariable Long proposalId) {
        return proposalService.vote(proposalId, CurrentUser.id(jwt));
    }

    @DeleteMapping("/proposals/{proposalId}/vote")
    @Operation(summary = "Bỏ tim (idempotent)")
    public ProposalListResponse unvote(@AuthenticationPrincipal Jwt jwt, @PathVariable Long proposalId) {
        return proposalService.unvote(proposalId, CurrentUser.id(jwt));
    }

    @PostMapping("/proposals/{proposalId}/schedule")
    @Operation(summary = "Đưa đề xuất vào lịch trình (EDITOR+, trip đã chốt ngày)")
    public ProposalListResponse schedule(@AuthenticationPrincipal Jwt jwt, @PathVariable Long proposalId,
                                         @Valid @RequestBody ScheduleProposalRequest request) {
        return proposalService.schedule(proposalId, CurrentUser.id(jwt), request);
    }
}
