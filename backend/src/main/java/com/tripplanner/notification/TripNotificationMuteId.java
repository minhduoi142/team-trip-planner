package com.tripplanner.notification;

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
public class TripNotificationMuteId implements Serializable {

    @Column(name = "trip_id")
    private Long tripId;

    @Column(name = "user_id")
    private Long userId;
}
