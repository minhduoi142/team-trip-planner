package com.tripplanner.tripday.dto;

import com.tripplanner.trip.Trip;
import com.tripplanner.tripday.TripDay;
import java.time.LocalDate;

/** {@code date} null khi chưa chốt hoặc là ngày thừa ({@code overflow}). */
public record TripDayResponse(Long id, int dayIndex, LocalDate date, String note, boolean overflow) {

    public static TripDayResponse from(TripDay day, Trip trip) {
        return new TripDayResponse(day.getId(), day.getDayIndex(), day.dateIn(trip), day.getNote(),
                day.isOverflow(trip));
    }
}
