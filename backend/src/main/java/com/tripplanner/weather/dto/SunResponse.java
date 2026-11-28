package com.tripplanner.weather.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.tripplanner.weather.SunTimes;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * Giờ mặt trời và giờ vàng của 1 ngày (docs/sdd-golden-hour-outfit.md A.4), giờ địa phương của điểm đến dạng "HH:mm".
 * {@code timezone}: múi giờ IANA của điểm đến (FE ghi "giờ địa phương" khi khác Asia/Ho_Chi_Minh).
 */
public record SunResponse(
        @JsonFormat(pattern = "HH:mm") LocalTime sunrise,
        @JsonFormat(pattern = "HH:mm") LocalTime sunset,
        @JsonFormat(pattern = "HH:mm") LocalTime morningGoldenStart,
        @JsonFormat(pattern = "HH:mm") LocalTime morningGoldenEnd,
        @JsonFormat(pattern = "HH:mm") LocalTime eveningGoldenStart,
        @JsonFormat(pattern = "HH:mm") LocalTime eveningGoldenEnd,
        String timezone) {

    public static SunResponse from(SunTimes.Sun sun, ZoneId zone) {
        return new SunResponse(sun.sunrise(), sun.sunset(), sun.morningGoldenStart(), sun.morningGoldenEnd(),
                sun.eveningGoldenStart(), sun.eveningGoldenEnd(), zone.getId());
    }
}
