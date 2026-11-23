package com.tripplanner.notification;

import com.tripplanner.notification.dto.NotificationDtos.TripMuteResponse;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripRole;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Thành viên tắt/bật email của 1 chuyến (docs/sdd-email-notifications.md §6.6). */
@Service
@RequiredArgsConstructor
public class TripMuteService {

    static final String REASON_MUTED = "TRIP_MUTED";

    private final TripAccessService accessService;
    private final TripNotificationMuteRepository muteRepository;
    private final NotificationOutbox outbox;
    private final Clock clock;

    @Transactional(readOnly = true)
    public TripMuteResponse get(Long tripId, Long userId) {
        accessService.require(tripId, userId, TripRole.VIEWER);
        return new TripMuteResponse(muteRepository.existsById(new TripNotificationMuteId(tripId, userId)));
    }

    /** Bật mute thì huỷ luôn các email đang chờ gửi của mình trong chuyến. Idempotent. */
    @Transactional
    public TripMuteResponse set(Long tripId, Long userId, boolean muted) {
        accessService.require(tripId, userId, TripRole.VIEWER);
        TripNotificationMuteId id = new TripNotificationMuteId(tripId, userId);
        boolean exists = muteRepository.existsById(id);
        if (muted && !exists) {
            muteRepository.save(new TripNotificationMute(tripId, userId, clock.instant()));
        } else if (!muted && exists) {
            muteRepository.deleteById(id);
        }
        if (muted) {
            outbox.cancelPendingForTrip(userId, tripId, REASON_MUTED);
        }
        return new TripMuteResponse(muted);
    }
}
