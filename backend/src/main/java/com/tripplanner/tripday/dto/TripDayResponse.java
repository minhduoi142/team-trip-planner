package com.tripplanner.tripday.dto;

import com.tripplanner.tripday.TripDay;
import java.time.LocalDate;

public record TripDayResponse(Long id, int dayIndex, LocalDate date, String note) {

    public static TripDayResponse from(TripDay day) {
        return new TripDayResponse(day.getId(), day.getDayIndex(), day.getActualDate(), day.getNote());
    }
}
