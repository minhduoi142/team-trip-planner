package com.tripplanner.outfit;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class DayOutfitId implements Serializable {

    @Column(name = "trip_day_id")
    private Long tripDayId;

    @Column(name = "user_id")
    private Long userId;
}
