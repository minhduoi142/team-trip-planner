package com.tripplanner.tripday;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Chốt / mở lại ngày đi. Đây là nơi DUY NHẤT ghi trips.start_date/end_date và trip_days, để giữ
 * bất biến actual_date = start_date + (day_index - 1).
 */
@Service
@RequiredArgsConstructor
public class TripDayService {

    static final int MAX_TRIP_DAYS = 30;

    private final TripAccessService accessService;
    private final TripDayRepository tripDayRepository;
    private final TripService tripService;
    private final Clock clock;

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
        long totalDays = ChronoUnit.DAYS.between(start, end) + 1;
        if (totalDays > MAX_TRIP_DAYS) {
            throw new BusinessException(ErrorCode.INVALID_DATE_RANGE,
                    "Chuyến đi tối đa " + MAX_TRIP_DAYS + " ngày");
        }

        trip.setStartDate(start);
        trip.setEndDate(end);
        for (int i = 0; i < totalDays; i++) {
            tripDayRepository.save(TripDay.builder()
                    .trip(trip)
                    .dayIndex(i + 1)
                    .actualDate(start.plusDays(i))
                    .build());
        }
        return tripService.get(tripId, userId);
    }

    /** Mở lại khảo sát: xóa ngày chính thức + trip_days, GIỮ lịch rảnh. */
    @Transactional
    public TripDetailResponse unlock(Long tripId, Long userId) {
        Trip trip = accessService.require(tripId, userId, TripRole.OWNER).getTrip();
        if (!trip.isLocked()) {
            throw new BusinessException(ErrorCode.NOT_LOCKED);
        }
        trip.setStartDate(null);
        trip.setEndDate(null);
        // flushAutomatically ghi thay đổi của trip trước khi xóa hàng loạt rồi clear context
        tripDayRepository.deleteAllByTripId(tripId);
        return tripService.get(tripId, userId);
    }

    @Transactional(readOnly = true)
    public List<TripDayResponse> list(Long tripId, Long userId) {
        accessService.require(tripId, userId, TripRole.VIEWER);
        return tripDayRepository.findAllByTripId(tripId).stream().map(TripDayResponse::from).toList();
    }
}
