package com.tripplanner.tripday;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.itinerary.ItineraryItemRepository;
import com.tripplanner.outfit.DayOutfitRepository;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripRole;
import com.tripplanner.trip.TripService;
import com.tripplanner.trip.dto.TripDetailResponse;
import com.tripplanner.tripday.dto.LockDateRequest;
import com.tripplanner.tripday.dto.TripDayResponse;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Chốt / mở lại ngày đi. Nơi DUY NHẤT ghi trips.start_date/end_date và tạo/xóa trip_days theo số ngày.
 * Phase 3: trip_days là "Ngày N" bền vững, ngày thực được suy ra → mở lại KHÔNG xóa ngày.
 */
@Service
@RequiredArgsConstructor
public class TripDayService {

    static final int MAX_TRIP_DAYS = 30;

    private final TripAccessService accessService;
    private final TripDayRepository tripDayRepository;
    private final TripDayDressColorRepository colorRepository;
    private final ItineraryItemRepository itemRepository;
    private final DayOutfitRepository outfitRepository;
    private final TripService tripService;
    private final Clock clock;

    /**
     * Chốt N ngày: tạo các Ngày 1..N còn thiếu; ngày có dayIndex > N mà không có nội dung thì xóa,
     * có nội dung thì giữ lại làm "ngày thừa" để người dùng chuyển hoạt động sang ngày khác.
     */
    @Transactional
    public TripDetailResponse lock(Long tripId, Long userId, LockDateRequest request) {
        Trip trip = accessService.require(tripId, userId, TripRole.OWNER).getTrip();
        if (trip.isLocked()) {
            throw new BusinessException(ErrorCode.ALREADY_LOCKED);
        }
        LocalDate start = request.startDate();
        LocalDate end = request.endDate();
        if (end.isBefore(start)) {
            throw new BusinessException(ErrorCode.INVALID_DATE_RANGE, "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
        }
        if (start.isBefore(LocalDate.now(clock))) {
            throw new BusinessException(ErrorCode.INVALID_DATE_RANGE, "Không chốt được ngày bắt đầu trong quá khứ");
        }
        int totalDays = (int) ChronoUnit.DAYS.between(start, end) + 1;
        if (totalDays > MAX_TRIP_DAYS) {
            throw new BusinessException(ErrorCode.INVALID_DATE_RANGE, "Chuyến đi tối đa " + MAX_TRIP_DAYS + " ngày");
        }

        trip.setStartDate(start);
        trip.setEndDate(end);

        List<TripDay> existing = tripDayRepository.findAllByTripId(tripId);
        Set<Integer> indexes = existing.stream().map(TripDay::getDayIndex).collect(Collectors.toSet());
        for (int i = 1; i <= totalDays; i++) {
            if (!indexes.contains(i)) {
                tripDayRepository.save(TripDay.builder().trip(trip).dayIndex(i).build());
            }
        }
        existing.stream()
                .filter(day -> day.getDayIndex() > totalDays && !hasContent(day))
                .forEach(tripDayRepository::delete);
        return tripService.get(tripId, userId);
    }

    /** Mở lại khảo sát: chỉ xóa ngày chính thức; GIỮ trip_days + lịch trình + lịch rảnh. */
    @Transactional
    public TripDetailResponse unlock(Long tripId, Long userId) {
        Trip trip = accessService.require(tripId, userId, TripRole.OWNER).getTrip();
        if (!trip.isLocked()) {
            throw new BusinessException(ErrorCode.NOT_LOCKED);
        }
        trip.setStartDate(null);
        trip.setEndDate(null);
        return tripService.get(tripId, userId);
    }

    @Transactional(readOnly = true)
    public List<TripDayResponse> list(Long tripId, Long userId) {
        Trip trip = accessService.require(tripId, userId, TripRole.VIEWER).getTrip();
        return tripDayRepository.findAllByTripId(tripId).stream()
                .map(day -> TripDayResponse.from(day, trip))
                .toList();
    }

    private boolean hasContent(TripDay day) {
        return day.hasOwnFields()
                || itemRepository.countByDayId(day.getId()) > 0
                || colorRepository.countByIdTripDayId(day.getId()) > 0
                || outfitRepository.countByDayId(day.getId()) > 0;   // outfit của thành viên (V12)
    }
}
