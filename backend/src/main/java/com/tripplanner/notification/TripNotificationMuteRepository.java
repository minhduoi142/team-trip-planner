package com.tripplanner.notification;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TripNotificationMuteRepository extends JpaRepository<TripNotificationMute, TripNotificationMuteId> {
}
