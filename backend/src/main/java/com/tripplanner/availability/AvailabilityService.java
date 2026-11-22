package com.tripplanner.availability;

import com.tripplanner.availability.dto.AvailabilityEntryResponse;
import com.tripplanner.availability.dto.AvailabilityMatrixResponse;
import com.tripplanner.availability.dto.AvailabilityMemberResponse;
import com.tripplanner.availability.dto.DaySummaryResponse;
import com.tripplanner.availability.dto.SuggestionResponse;
import com.tripplanner.availability.dto.UpdateAvailabilityRequest;
import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripMemberRepository;
import com.tripplanner.trip.TripRole;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AvailabilityService {

    public static final int DEFAULT_TRIP_LENGTH = 3;
    public static final int MIN_TRIP_LENGTH = 1;
    public static final int MAX_TRIP_LENGTH = 14;
    /** Khoảng khảo sát tối đa (đồng bộ với giới hạn ở TripService). */
    public static final int MAX_SURVEY_DAYS = 62;

    private final TripAccessService accessService;
    private final TripMemberRepository memberRepository;
    private final MemberAvailabilityRepository availabilityRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public AvailabilityMatrixResponse getMatrix(Long tripId, Long userId) {
        Trip trip = accessService.require(tripId, userId, TripRole.VIEWER).getTrip();
        return buildMatrix(trip);
    }

    /** Batch upsert lịch của chính mình; mọi thành viên (kể cả VIEWER) đều được khai. */
    @Transactional
    public AvailabilityMatrixResponse updateMine(Long tripId, Long userId, UpdateAvailabilityRequest request) {
        Trip trip = accessService.require(tripId, userId, TripRole.VIEWER).getTrip();
        if (trip.isLocked()) {
            throw new BusinessException(ErrorCode.AVAILABILITY_LOCKED);
        }
        List<LocalDate> range = surveyDays(trip);
        if (range.isEmpty()) {
            throw new BusinessException(ErrorCode.NO_PLANNED_RANGE);
        }
        LocalDate first = range.getFirst();
        LocalDate last = range.getLast();

        // Ngày trùng trong cùng request: lấy giá trị sau cùng
        Map<LocalDate, AvailabilityStatus> changes = new LinkedHashMap<>();
        for (UpdateAvailabilityRequest.Entry entry : request.entries()) {
            if (entry.date().isBefore(first) || entry.date().isAfter(last)) {
                throw new BusinessException(ErrorCode.DATE_OUT_OF_RANGE);
            }
            changes.put(entry.date(), entry.status());
        }

        Map<LocalDate, MemberAvailability> existing = availabilityRepository
                .findForUserAndDates(tripId, userId, changes.keySet()).stream()
                .collect(Collectors.toMap(MemberAvailability::getDate, Function.identity()));

        changes.forEach((date, status) -> {
            MemberAvailability current = existing.get(date);
            if (status == null) {
                if (current != null) {
                    availabilityRepository.delete(current);
                }
            } else if (current != null) {
                current.setStatus(status);
            } else {
                availabilityRepository.save(new MemberAvailability(tripId, userId, date, status));
            }
        });
        availabilityRepository.flush();
        return buildMatrix(trip);
    }

    @Transactional
    public AvailabilityMatrixResponse setTripLength(Long tripId, Long userId, int days) {
        Trip trip = accessService.require(tripId, userId, TripRole.EDITOR).getTrip();
        if (trip.isLocked()) {
            throw new BusinessException(ErrorCode.AVAILABILITY_LOCKED);
        }
        if (days < MIN_TRIP_LENGTH || days > MAX_TRIP_LENGTH) {
            throw new BusinessException(ErrorCode.INVALID_TRIP_LENGTH);
        }
        trip.setTripLengthDays(days);
        return buildMatrix(trip);
    }

    // ---------------------------------------------------------------- matrix

    private AvailabilityMatrixResponse buildMatrix(Trip trip) {
        List<TripMember> members = memberRepository.findAllWithUserByTripId(trip.getId());
        List<Long> memberIds = members.stream().map(m -> m.getUser().getId()).toList();
        int effectiveLength = trip.getTripLengthDays() != null ? trip.getTripLengthDays() : DEFAULT_TRIP_LENGTH;
        List<LocalDate> range = surveyDays(trip);

        if (range.isEmpty()) {
            List<AvailabilityMemberResponse> memberRows = members.stream()
                    .map(m -> memberRow(m, 0)).toList();
            return new AvailabilityMatrixResponse(null, null, trip.getTripLengthDays(), effectiveLength,
                    trip.isLocked(), trip.getStartDate(), trip.getEndDate(), memberRows, List.of(), List.of(),
                    List.of(), "NO_RANGE");
        }

        List<MemberAvailability> rows = availabilityRepository
                .findInRange(trip.getId(), range.getFirst(), range.getLast());
        // Bỏ dòng của người đã rời nhóm (phòng hờ; bình thường đã bị CASCADE)
        Map<Long, Map<LocalDate, AvailabilityStatus>> byUser = new HashMap<>();
        memberIds.forEach(id -> byUser.put(id, new HashMap<>()));
        rows.stream()
                .filter(a -> byUser.containsKey(a.getUserId()))
                .forEach(a -> byUser.get(a.getUserId()).put(a.getDate(), a.getStatus()));

        List<AvailabilityEntryResponse> entries = rows.stream()
                .filter(a -> byUser.containsKey(a.getUserId()))
                .sorted((a, b) -> a.getDate().compareTo(b.getDate()))
                .map(a -> new AvailabilityEntryResponse(a.getUserId(), a.getDate(), a.getStatus()))
                .toList();

        List<DaySummaryResponse> days = range.stream().map(date -> {
            int available = 0;
            int maybe = 0;
            int busy = 0;
            for (Long id : memberIds) {
                AvailabilityStatus s = byUser.get(id).get(date);
                if (s == AvailabilityStatus.AVAILABLE) available++;
                else if (s == AvailabilityStatus.MAYBE) maybe++;
                else if (s == AvailabilityStatus.BUSY) busy++;
            }
            return new DaySummaryResponse(date, available, maybe, busy, memberIds.size() - available - maybe - busy);
        }).toList();

        List<SuggestionResponse> suggestions = List.of();
        String note;
        if (trip.isLocked()) {
            note = "LOCKED";
        } else {
            LocalDate today = LocalDate.now(clock);
            List<LocalDate> futureDays = range.stream().filter(d -> !d.isBefore(today)).toList();
            AvailabilitySuggester.Result result =
                    AvailabilitySuggester.suggest(futureDays, effectiveLength, memberIds, byUser);
            suggestions = result.suggestions().stream()
                    .map(w -> SuggestionResponse.from(w, memberIds.size()))
                    .toList();
            note = result.note() == null ? null : result.note().name();
        }

        List<AvailabilityMemberResponse> memberRows = members.stream()
                .map(m -> memberRow(m, byUser.get(m.getUser().getId()).size()))
                .toList();
        return new AvailabilityMatrixResponse(range.getFirst(), range.getLast(), trip.getTripLengthDays(),
                effectiveLength, trip.isLocked(), trip.getStartDate(), trip.getEndDate(), memberRows, entries,
                days, suggestions, note);
    }

    private static AvailabilityMemberResponse memberRow(TripMember m, int respondedDays) {
        return new AvailabilityMemberResponse(m.getUser().getId(), m.getUser().getDisplayName(),
                m.getUser().getAvatarUrl(), respondedDays);
    }

    /** Các ngày trong khoảng dự kiến (cắt ở {@value #MAX_SURVEY_DAYS} ngày); rỗng nếu chưa có khoảng. */
    static List<LocalDate> surveyDays(Trip trip) {
        if (!trip.hasPlannedRange()) {
            return List.of();
        }
        LocalDate start = trip.getPlannedStartDate();
        LocalDate end = trip.getPlannedEndDate();
        LocalDate cap = start.plusDays(MAX_SURVEY_DAYS - 1L);
        return start.datesUntil((end.isAfter(cap) ? cap : end).plusDays(1)).toList();
    }
}
