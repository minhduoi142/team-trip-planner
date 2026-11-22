package com.tripplanner.tripday;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class TripDayDressColorId implements Serializable {

    @Column(name = "trip_day_id")
    private Long tripDayId;

    @Column(name = "color_key", length = 20)
    private String colorKey;
}
