package com.tripplanner.itinerary;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.itinerary.dto.DressCodeResponse;
import com.tripplanner.itinerary.dto.ItineraryDayResponse;
import com.tripplanner.itinerary.dto.ItineraryItemRequest;
import com.tripplanner.itinerary.dto.ItineraryItemResponse;
import com.tripplanner.itinerary.dto.ItineraryResponse;
import com.tripplanner.itinerary.dto.UpdateDayRequest;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripRepository;
import com.tripplanner.trip.TripRole;
import com.tripplanner.tripday.TripDay;
import com.tripplanner.tripday.TripDayDressColor;
import com.tripplanner.tripday.TripDayDressColorRepository;
import com.tripplanner.tripday.TripDayRepository;
import com.tripplanner.user.UserRepository;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class ItineraryService {

    private final TripAccessService accessService;
    private final TripRepository tripRepository;
    private final TripDayRepository dayRepository;
    private final TripDayDressColorRepository colorRepository;
    private final ItineraryItemRepository itemRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ItineraryResponse get(Long tripId, Long userId) {
        accessService.require(tripId, userId, TripRole.VIEWER);
        return build(tripId);
    }

    // ---------------------------------------------------------------- items

    @Transactional
    public ItineraryResponse addItem(Long dayId, Long userId, ItineraryItemRequest request) {
        TripDay day = requireDay(dayId, userId, TripRole.EDITOR);
        ItineraryItem item = ItineraryItem.builder()
                .tripDay(day)
                .sortOrder(Integer.MAX_VALUE)
                .createdBy(userRepository.getReferenceById(userId))
                .build();
        apply(item, request);
        itemRepository.save(item);
        List<ItineraryItem> current = itemRepository.findAllByDayId(dayId);
        current.remove(item);
        renumber(ItineraryOrdering.place(current, item, ItineraryItem::getStartTime, false));
        return build(day.getTrip().getId());
    }

    @Transactional
    public ItineraryResponse updateItem(Long itemId, Long userId, ItineraryItemRequest request) {
        ItineraryItem item = requireItem(itemId, userId);
        LocalTime oldStart = item.getStartTime();
        apply(item, request);
        if (!Objects.equals(oldStart, item.getStartTime())) {
            List<ItineraryItem> current = itemRepository.findAllByDayId(item.getTripDay().getId());
            renumber(ItineraryOrdering.place(current, item, ItineraryItem::getStartTime, true));
        }
        return build(item.getTripDay().getTrip().getId());
    }

    @Transactional
    public ItineraryResponse deleteItem(Long itemId, Long userId) {
        ItineraryItem item = requireItem(itemId, userId);
        Long dayId = item.getTripDay().getId();
        Long tripId = item.getTripDay().getTrip().getId();
        itemRepository.delete(item);
        itemRepository.flush();
        renumber(itemRepository.findAllByDayId(dayId));
        return build(tripId);
    }

    /** Kéo thả trong ngày: itemIds phải là ĐÚNG tập item hiện có của ngày. */
    @Transactional
    public ItineraryResponse reorder(Long dayId, Long userId, List<Long> itemIds) {
        TripDay day = requireDay(dayId, userId, TripRole.EDITOR);
        List<ItineraryItem> current = itemRepository.findAllByDayId(dayId);
        Map<Long, ItineraryItem> byId = current.stream()
                .collect(Collectors.toMap(ItineraryItem::getId, i -> i));
        if (itemIds.size() != current.size() || new HashSet<>(itemIds).size() != itemIds.size()
                || !byId.keySet().containsAll(itemIds)) {
            throw new BusinessException(ErrorCode.INVALID_ORDER);
        }
        renumber(itemIds.stream().map(byId::get).toList());
        return build(day.getTrip().getId());
    }

    /** Chuyển sang ngày khác cùng trip; tự chèn theo giờ ở ngày đích. */
    @Transactional
    public ItineraryResponse move(Long itemId, Long userId, Long targetDayId) {
        ItineraryItem item = requireItem(itemId, userId);
        TripDay source = item.getTripDay();
        Long tripId = source.getTrip().getId();
        TripDay target = dayRepository.findById(targetDayId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DAY_NOT_FOUND));
        if (!target.getTrip().getId().equals(tripId)) {
            throw new BusinessException(ErrorCode.INVALID_ORDER);
        }
        if (target.getId().equals(source.getId())) {
            return build(tripId);
        }
        item.setTripDay(target);
        itemRepository.flush();
        renumber(itemRepository.findAllByDayId(source.getId()));
        List<ItineraryItem> targetItems = itemRepository.findAllByDayId(target.getId());
        targetItems.remove(item);
        renumber(ItineraryOrdering.place(targetItems, item, ItineraryItem::getStartTime, false));
        return build(tripId);
    }

    // ---------------------------------------------------------------- day (ghi chú + dress code)

    @Transactional
    public ItineraryResponse updateDay(Long dayId, Long userId, UpdateDayRequest request) {
        TripDay day = requireDay(dayId, userId, TripRole.EDITOR);
        Set<String> colors = new LinkedHashSet<>(request.dressColors() == null ? List.of() : request.dressColors());
        if (colors.size() > TripDayDressColor.MAX_PER_DAY || !TripDayDressColor.ALLOWED.containsAll(colors)) {
            throw new BusinessException(ErrorCode.INVALID_DRESS_COLOR);
        }
        day.setNote(blankToNull(request.note()));
        day.setDressTheme(blankToNull(request.dressTheme()));
        day.setDressNote(blankToNull(request.dressNote()));
        day.setDressImageUrl(blankToNull(request.dressImageUrl()));
        colorRepository.deleteByDayId(dayId);
        colors.forEach(key -> colorRepository.save(new TripDayDressColor(dayId, key)));
        return build(day.getTrip().getId());
    }

    /** Chỉ xóa được ngày thừa (dayIndex > số ngày đã chốt); items + màu bị xóa theo (CASCADE). */
    @Transactional
    public ItineraryResponse deleteOverflowDay(Long dayId, Long userId) {
        TripDay day = requireDay(dayId, userId, TripRole.EDITOR);
        Trip trip = day.getTrip();
        if (!day.isOverflow(trip)) {
            throw new BusinessException(ErrorCode.DAY_NOT_OVERFLOW);
        }
        Long tripId = trip.getId();
        dayRepository.delete(day);
        dayRepository.flush();
        return build(tripId);
    }

    // ---------------------------------------------------------------- build

    private ItineraryResponse build(Long tripId) {
        Trip trip = tripRepository.findById(tripId).orElseThrow(() -> new BusinessException(ErrorCode.TRIP_NOT_FOUND));
        List<TripDay> days = dayRepository.findAllByTripId(tripId);
        List<Long> dayIds = days.stream().map(TripDay::getId).toList();

        Map<Long, List<ItineraryItem>> itemsByDay = dayIds.isEmpty() ? Map.of()
                : itemRepository.findAllByDayIds(dayIds).stream()
                        .collect(Collectors.groupingBy(i -> i.getTripDay().getId()));
        Map<Long, List<String>> colorsByDay = dayIds.isEmpty() ? Map.of()
                : colorRepository.findByDayIds(dayIds).stream()
                        .collect(Collectors.groupingBy(c -> c.getId().getTripDayId(),
                                Collectors.mapping(c -> c.getId().getColorKey(), Collectors.toList())));

        List<ItineraryDayResponse> dayResponses = new ArrayList<>();
        long tripTotal = 0;
        for (TripDay day : days) {
            List<ItineraryItem> items = itemsByDay.getOrDefault(day.getId(), List.of());
            long dayTotal = items.stream().map(ItineraryItem::getEstimatedCost).filter(Objects::nonNull)
                    .mapToLong(Long::longValue).sum();
            tripTotal += dayTotal;
            List<String> colors = colorsByDay.getOrDefault(day.getId(), List.of()).stream()
                    .sorted(Comparator.comparingInt(TripDayDressColor.PALETTE::indexOf))
                    .toList();
            dayResponses.add(new ItineraryDayResponse(
                    day.getId(), day.getDayIndex(), day.dateIn(trip), day.isOverflow(trip), day.getNote(),
                    new DressCodeResponse(day.getDressTheme(), day.getDressNote(), day.getDressImageUrl(), colors),
                    dayTotal,
                    ItineraryOrdering.isTimeOrderBroken(items, ItineraryItem::getStartTime),
                    items.stream().map(ItineraryItemResponse::from).toList()));
        }
        return new ItineraryResponse(trip.isLocked(), trip.getStartDate(), trip.getEndDate(),
                TripDay.lockedLength(trip), tripTotal, dayResponses);
    }

    // ---------------------------------------------------------------- helpers

    private TripDay requireDay(Long dayId, Long userId, TripRole minRole) {
        Long tripId = dayRepository.findTripIdByDayId(dayId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DAY_NOT_FOUND));
        accessService.require(tripId, userId, minRole);
        return dayRepository.findById(dayId).orElseThrow(() -> new BusinessException(ErrorCode.DAY_NOT_FOUND));
    }

    private ItineraryItem requireItem(Long itemId, Long userId) {
        Long tripId = itemRepository.findTripIdByItemId(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));
        accessService.require(tripId, userId, TripRole.EDITOR);
        return itemRepository.findById(itemId).orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));
    }

    private void apply(ItineraryItem item, ItineraryItemRequest request) {
        if (request.endTime() != null && request.startTime() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Có giờ kết thúc thì cần nhập giờ bắt đầu");
        }
        item.setTitle(request.title().trim());
        item.setCategory(request.category());
        item.setStartTime(request.startTime());
        item.setEndTime(request.endTime());
        item.setLocationName(blankToNull(request.locationName()));
        item.setMapsUrl(blankToNull(request.mapsUrl()));
        item.setNote(blankToNull(request.note()));
        item.setEstimatedCost(request.estimatedCost());
    }

    private static void renumber(List<ItineraryItem> ordered) {
        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).setSortOrder(i);
        }
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
