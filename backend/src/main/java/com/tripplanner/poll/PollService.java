package com.tripplanner.poll;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.itinerary.ItineraryService;
import com.tripplanner.itinerary.dto.ItineraryItemRequest;
import com.tripplanner.poll.dto.PollDtos.AddToItinerary;
import com.tripplanner.poll.dto.PollDtos.ClosePollRequest;
import com.tripplanner.poll.dto.PollDtos.CreatePollRequest;
import com.tripplanner.poll.dto.PollDtos.OptionRequest;
import com.tripplanner.poll.dto.PollDtos.OptionResponse;
import com.tripplanner.poll.dto.PollDtos.PollListResponse;
import com.tripplanner.poll.dto.PollDtos.PollResponse;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripRole;
import com.tripplanner.tripday.TripDayRepository;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Quyền: tạo bình chọn EDITOR+; thêm lựa chọn + vote: mọi thành viên; chốt/mở lại/xóa: người tạo hoặc EDITOR+;
 * xóa lựa chọn: người thêm hoặc EDITOR+. Mọi thao tác ghi trả lại toàn bộ danh sách.
 */
@Service
@RequiredArgsConstructor
public class PollService {

    private final TripAccessService accessService;
    private final PollRepository pollRepository;
    private final PollOptionRepository optionRepository;
    private final PollVoteRepository voteRepository;
    private final UserRepository userRepository;
    private final TripDayRepository dayRepository;
    private final ItineraryService itineraryService;

    @Transactional(readOnly = true)
    public PollListResponse list(Long tripId, Long userId) {
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        return build(tripId, me);
    }

    @Transactional
    public PollListResponse create(Long tripId, Long userId, CreatePollRequest request) {
        TripMember me = accessService.require(tripId, userId, TripRole.EDITOR);
        Poll poll = pollRepository.save(Poll.builder()
                .trip(me.getTrip())
                .title(request.title().trim())
                .createdBy(userRepository.getReferenceById(userId))
                .build());
        if (request.options() != null) {
            request.options().forEach(option -> saveOption(poll, option, userId));
        }
        return build(tripId, me);
    }

    @Transactional
    public PollListResponse delete(Long pollId, Long userId) {
        Access access = requireManage(pollId, userId);
        pollRepository.delete(access.poll());
        pollRepository.flush();
        return build(access.tripId(), access.me());
    }

    @Transactional
    public PollListResponse addOption(Long pollId, Long userId, OptionRequest request) {
        Long tripId = tripOfPoll(pollId);
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        Poll poll = pollRepository.findById(pollId).orElseThrow(() -> new BusinessException(ErrorCode.POLL_NOT_FOUND));
        requireOpen(poll);
        saveOption(poll, request, userId);
        return build(tripId, me);
    }

    @Transactional
    public PollListResponse deleteOption(Long optionId, Long userId) {
        OptionAccess access = requireOption(optionId, userId);
        PollOption option = access.option();
        requireOpen(option.getPoll());
        boolean isAuthor = option.getCreatedBy() != null && option.getCreatedBy().getId().equals(userId);
        if (!isAuthor && !access.me().getRole().atLeast(TripRole.EDITOR)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        optionRepository.delete(option);
        optionRepository.flush();
        return build(access.tripId(), access.me());
    }

    /** Idempotent: đã vote rồi thì giữ nguyên. */
    @Transactional
    public PollListResponse vote(Long optionId, Long userId) {
        OptionAccess access = requireOption(optionId, userId);
        requireOpen(access.option().getPoll());
        PollVoteId id = new PollVoteId(optionId, userId);
        if (!voteRepository.existsById(id)) {
            voteRepository.save(new PollVote(optionId, userId));
        }
        return build(access.tripId(), access.me());
    }

    @Transactional
    public PollListResponse unvote(Long optionId, Long userId) {
        OptionAccess access = requireOption(optionId, userId);
        requireOpen(access.option().getPoll());
        voteRepository.findById(new PollVoteId(optionId, userId)).ifPresent(voteRepository::delete);
        voteRepository.flush();
        return build(access.tripId(), access.me());
    }

    /** Chốt; nếu có addToItinerary thì tạo hoạt động ở ngày đó (tự chèn theo giờ như Phase 3). */
    @Transactional
    public PollListResponse close(Long pollId, Long userId, ClosePollRequest request) {
        Access access = requireManage(pollId, userId);
        Poll poll = access.poll();
        requireOpen(poll);
        PollOption winner = optionRepository.findById(request.optionId())
                .filter(o -> o.getPoll().getId().equals(pollId))
                .orElseThrow(() -> new BusinessException(ErrorCode.OPTION_NOT_FOUND));

        AddToItinerary add = request.addToItinerary();
        if (add != null) {
            Long dayTripId = dayRepository.findTripIdByDayId(add.dayId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.DAY_NOT_FOUND));
            if (!dayTripId.equals(access.tripId())) {
                throw new BusinessException(ErrorCode.DAY_NOT_FOUND);
            }
            itineraryService.addItem(add.dayId(), userId, new ItineraryItemRequest(
                    winner.getName(), add.category(), add.startTime(), null,
                    winner.getName(), winner.getMapsUrl(), winner.getNote(), null));
        }
        poll.setWinningOption(winner);
        poll.setClosedAt(Instant.now());
        return build(access.tripId(), access.me());
    }

    /** Mở lại; hoạt động đã thêm vào lịch trình (nếu có) vẫn giữ. */
    @Transactional
    public PollListResponse reopen(Long pollId, Long userId) {
        Access access = requireManage(pollId, userId);
        access.poll().setClosedAt(null);
        access.poll().setWinningOption(null);
        return build(access.tripId(), access.me());
    }

    // ---------------------------------------------------------------- build

    private PollListResponse build(Long tripId, TripMember me) {
        Long myId = me.getId().getUserId();
        boolean isEditor = me.getRole().atLeast(TripRole.EDITOR);
        List<Poll> polls = pollRepository.findAllByTripId(tripId);
        List<Long> pollIds = polls.stream().map(Poll::getId).toList();
        List<PollOption> options = pollIds.isEmpty() ? List.of() : optionRepository.findAllByPollIds(pollIds);
        List<Long> optionIds = options.stream().map(PollOption::getId).toList();
        Map<Long, List<Long>> votersByOption = optionIds.isEmpty() ? Map.of()
                : voteRepository.findAllByOptionIds(optionIds).stream()
                        .collect(Collectors.groupingBy(v -> v.getId().getOptionId(),
                                Collectors.mapping(v -> v.getId().getUserId(), Collectors.toList())));
        Map<Long, List<PollOption>> optionsByPoll = options.stream()
                .collect(Collectors.groupingBy(o -> o.getPoll().getId()));

        List<PollResponse> responses = polls.stream()
                .sorted(Comparator.comparing(Poll::isClosed))
                .map(poll -> {
                    boolean canManage = isEditor || isCreator(poll.getCreatedBy(), myId);
                    List<OptionResponse> optionResponses = optionsByPoll.getOrDefault(poll.getId(), List.of()).stream()
                            .map(o -> {
                                List<Long> voters = votersByOption.getOrDefault(o.getId(), List.of());
                                return new OptionResponse(o.getId(), o.getName(), o.getMapsUrl(), o.getNote(),
                                        nameOf(o.getCreatedBy()), voters.size(), voters, voters.contains(myId),
                                        !poll.isClosed() && (isEditor || isCreator(o.getCreatedBy(), myId)));
                            })
                            .toList();
                    return new PollResponse(poll.getId(), poll.getTitle(), nameOf(poll.getCreatedBy()),
                            poll.getCreatedAt(), poll.isClosed(), poll.getClosedAt(),
                            poll.getWinningOption() == null ? null : poll.getWinningOption().getId(),
                            canManage, optionResponses);
                })
                .toList();
        return new PollListResponse(responses);
    }

    // ---------------------------------------------------------------- helpers

    private void saveOption(Poll poll, OptionRequest request, Long userId) {
        try {
            optionRepository.saveAndFlush(PollOption.builder()
                    .poll(poll)
                    .name(request.name().trim())
                    .mapsUrl(blankToNull(request.mapsUrl()))
                    .note(blankToNull(request.note()))
                    .createdBy(userRepository.getReferenceById(userId))
                    .build());
        } catch (DataIntegrityViolationException e) {
            // UNIQUE (poll_id, name) với collation không phân biệt hoa thường/dấu
            throw new BusinessException(ErrorCode.DUPLICATE_OPTION);
        }
    }

    private record Access(Poll poll, Long tripId, TripMember me) {
    }

    private record OptionAccess(PollOption option, Long tripId, TripMember me) {
    }

    private Long tripOfPoll(Long pollId) {
        return pollRepository.findTripIdByPollId(pollId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POLL_NOT_FOUND));
    }

    private Access requireManage(Long pollId, Long userId) {
        Long tripId = tripOfPoll(pollId);
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        Poll poll = pollRepository.findById(pollId).orElseThrow(() -> new BusinessException(ErrorCode.POLL_NOT_FOUND));
        if (!me.getRole().atLeast(TripRole.EDITOR) && !isCreator(poll.getCreatedBy(), userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return new Access(poll, tripId, me);
    }

    private OptionAccess requireOption(Long optionId, Long userId) {
        Long tripId = optionRepository.findTripIdByOptionId(optionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.OPTION_NOT_FOUND));
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        PollOption option = optionRepository.findById(optionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.OPTION_NOT_FOUND));
        return new OptionAccess(option, tripId, me);
    }

    private static void requireOpen(Poll poll) {
        if (poll.isClosed()) {
            throw new BusinessException(ErrorCode.POLL_CLOSED);
        }
    }

    private static boolean isCreator(User createdBy, Long userId) {
        return createdBy != null && createdBy.getId().equals(userId);
    }

    private static String nameOf(User user) {
        return user == null ? null : user.getDisplayName();
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
