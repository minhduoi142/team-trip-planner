package com.tripplanner.notification;

import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Đọc tuỳ chọn nhận email của người dùng (không có dòng = mọi thứ bật) và trạng thái tắt theo chuyến. */
@Component
@RequiredArgsConstructor
public class NotificationPreferences {

    private final UserNotificationPrefsRepository prefsRepository;
    private final TripNotificationMuteRepository muteRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public UserNotificationPrefs of(Long userId) {
        return prefsRepository.findById(userId).orElseGet(() -> UserNotificationPrefs.defaults(userId, clock.instant()));
    }

    @Transactional(readOnly = true)
    public boolean isTripMuted(Long tripId, Long userId) {
        return tripId != null && muteRepository.existsById(new TripNotificationMuteId(tripId, userId));
    }
}
