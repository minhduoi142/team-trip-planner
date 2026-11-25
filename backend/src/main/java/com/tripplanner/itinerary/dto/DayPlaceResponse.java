package com.tripplanner.itinerary.dto;

import com.tripplanner.tripday.TripDay;
import java.math.BigDecimal;

/** Vị trí riêng của 1 ngày (chuyến đi nhiều nơi). null trong {@link ItineraryDayResponse} = theo vị trí của chuyến. */
public record DayPlaceResponse(String name, BigDecimal lat, BigDecimal lon) {

    public static DayPlaceResponse of(TripDay day) {
        return day.getPlaceName() == null ? null
                : new DayPlaceResponse(day.getPlaceName(), day.getPlaceLat(), day.getPlaceLon());
    }
}
