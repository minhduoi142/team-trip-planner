package com.tripplanner.outfit;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.outfit.dto.OutfitDtos.DayOutfitsResponse;
import com.tripplanner.outfit.dto.OutfitDtos.OutfitBoardResponse;
import com.tripplanner.outfit.dto.OutfitDtos.OutfitRequest;
import com.tripplanner.outfit.dto.OutfitDtos.OutfitResponse;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripRole;
import com.tripplanner.tripday.TripDay;
import com.tripplanner.tripday.TripDayDressColor;
import com.tripplanner.tripday.TripDayRepository;
import com.tripplanner.user.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Outfit từng ngày (docs/sdd-golden-hour-outfit.md phần B). Mọi thành viên đăng/sửa/gỡ outfit của chính mình;
 * OWNER gỡ được outfit của người khác. Mọi thao tác trả lại toàn bộ bảng outfit của chuyến.
 */
@Service
@RequiredArgsConstructor
public class OutfitService {

    static final int MAX_PHOTOS = 4;
    static final int MAX_COLORS = 3;

    private final TripAccessService accessService;
    private final TripDayRepository dayRepository;
    private final DayOutfitRepository outfitRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public OutfitBoardResponse board(Long tripId, Long userId) {
        return build(accessService.require(tripId, userId, TripRole.VIEWER));
    }

    @Transactional
    public OutfitBoardResponse saveMine(Long dayId, Long userId, OutfitRequest request) {
        Access access = requireDay(dayId, userId);
        List<String> photos = request.photoUrls() == null ? List.of()
                : request.photoUrls().stream().map(String::trim).toList();
        Set<String> colors = new LinkedHashSet<>(request.colors() == null ? List.of() : request.colors());
        String note = StringUtils.hasText(request.note()) ? request.note().trim() : null;

        if (photos.size() > MAX_PHOTOS) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Tối đa " + MAX_PHOTOS + " ảnh");
        }
        if (colors.size() > MAX_COLORS || !TripDayDressColor.ALLOWED.containsAll(colors)) {
            throw new BusinessException(ErrorCode.INVALID_DRESS_COLOR,
                    "Màu không hợp lệ hoặc chọn quá " + MAX_COLORS + " màu");
        }
        if (photos.isEmpty() && colors.isEmpty() && note == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Thêm ít nhất 1 ảnh, 1 màu hoặc ghi chú");
        }

        DayOutfit outfit = outfitRepository.findById(new DayOutfitId(dayId, userId))
                .orElseGet(() -> new DayOutfit(access.day(), userRepository.getReferenceById(userId)));
        outfit.setNote(note);
        outfit.getPhotoUrls().clear();
        outfit.getPhotoUrls().addAll(photos);
        outfit.getColors().clear();
        outfit.getColors().addAll(colors);
        outfit.setUpdatedAt(Instant.now(clock));
        outfitRepository.saveAndFlush(outfit);
        return build(access.me());
    }

    /** Idempotent: chưa có outfit vẫn trả 200. */
    @Transactional
    public OutfitBoardResponse deleteMine(Long dayId, Long userId) {
        Access access = requireDay(dayId, userId);
        outfitRepository.findById(new DayOutfitId(dayId, userId)).ifPresent(outfitRepository::delete);
        outfitRepository.flush();
        return build(access.me());
    }

    /** OWNER gỡ outfit của người khác (gỡ của mình thì như {@link #deleteMine}). */
    @Transactional
    public OutfitBoardResponse deleteOf(Long dayId, Long targetUserId, Long userId) {
        if (targetUserId.equals(userId)) {
            return deleteMine(dayId, userId);
        }
        Access access = requireDay(dayId, userId);
        if (access.me().getRole() != TripRole.OWNER) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        outfitRepository.findById(new DayOutfitId(dayId, targetUserId)).ifPresent(outfitRepository::delete);
        outfitRepository.flush();
        return build(access.me());
    }

    // ---------------------------------------------------------------- helpers

    private Access requireDay(Long dayId, Long userId) {
        Long tripId = dayRepository.findTripIdByDayId(dayId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DAY_NOT_FOUND));
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        TripDay day = dayRepository.findById(dayId).orElseThrow(() -> new BusinessException(ErrorCode.DAY_NOT_FOUND));
        return new Access(day, me);
    }

    private OutfitBoardResponse build(TripMember me) {
        Long tripId = me.getTrip().getId();
        Long myId = me.getId().getUserId();
        boolean isOwner = me.getRole() == TripRole.OWNER;
        Map<Long, List<DayOutfit>> byDay = outfitRepository.findAllByTripId(tripId).stream()
                .collect(Collectors.groupingBy(o -> o.getId().getTripDayId()));
        Comparator<DayOutfit> order = Comparator
                .comparing((DayOutfit o) -> !o.getId().getUserId().equals(myId))   // của mình trước
                .thenComparing(DayOutfit::getUpdatedAt, Comparator.reverseOrder());

        List<DayOutfitsResponse> days = new ArrayList<>();
        for (TripDay day : dayRepository.findAllByTripId(tripId)) {
            List<OutfitResponse> outfits = byDay.getOrDefault(day.getId(), List.of()).stream()
                    .sorted(order)
                    .map(o -> {
                        boolean mine = o.getId().getUserId().equals(myId);
                        return new OutfitResponse(o.getId().getUserId(), o.getUser().getDisplayName(),
                                o.getUser().getAvatarUrl(), List.copyOf(o.getPhotoUrls()), List.copyOf(o.getColors()),
                                o.getNote(), o.getUpdatedAt(), mine, mine || isOwner);
                    })
                    .toList();
            days.add(new DayOutfitsResponse(day.getId(), day.getDayIndex(), outfits));
        }
        return new OutfitBoardResponse(days);
    }

    private record Access(TripDay day, TripMember me) {
    }
}
