package com.tripplanner.notification;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.notification.UnsubscribeTokens.Claims;
import com.tripplanner.notification.UnsubscribeTokens.Scope;
import com.tripplanner.notification.dto.NotificationDtos.NotificationPrefsRequest;
import com.tripplanner.notification.dto.NotificationDtos.NotificationSettingsResponse;
import com.tripplanner.notification.dto.NotificationDtos.UnsubscribeResponse;
import com.tripplanner.notification.mail.MailDeliveryException;
import com.tripplanner.notification.mail.MailGateway;
import com.tripplanner.notification.mail.NotificationMailBuilder;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripMemberRepository;
import com.tripplanner.trip.TripRepository;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Tuỳ chọn nhận email, mail thử, huỷ nhận qua link (docs/sdd-email-notifications.md §5.3–5.5). */
@Slf4j
@Service
public class NotificationSettingsService {

    static final Duration TEST_COOLDOWN = Duration.ofSeconds(60);

    private final UserRepository userRepository;
    private final UserNotificationPrefsRepository prefsRepository;
    private final TripNotificationMuteRepository muteRepository;
    private final TripMemberRepository memberRepository;
    private final TripRepository tripRepository;
    private final NotificationPreferences preferences;
    private final EmailVerificationService verificationService;
    private final UnsubscribeTokens unsubscribeTokens;
    private final MailGateway mailGateway;
    private final NotificationMailBuilder mailBuilder;
    private final Clock clock;
    /** Cooldown mail thử, giữ trong bộ nhớ (đủ cho 1 instance). */
    private final Map<Long, Instant> lastTestEmail = new ConcurrentHashMap<>();

    public NotificationSettingsService(UserRepository userRepository, UserNotificationPrefsRepository prefsRepository,
                                       TripNotificationMuteRepository muteRepository,
                                       TripMemberRepository memberRepository, TripRepository tripRepository,
                                       NotificationPreferences preferences,
                                       EmailVerificationService verificationService,
                                       UnsubscribeTokens unsubscribeTokens, MailGateway mailGateway,
                                       NotificationMailBuilder mailBuilder, Clock clock) {
        this.userRepository = userRepository;
        this.prefsRepository = prefsRepository;
        this.muteRepository = muteRepository;
        this.memberRepository = memberRepository;
        this.tripRepository = tripRepository;
        this.preferences = preferences;
        this.verificationService = verificationService;
        this.unsubscribeTokens = unsubscribeTokens;
        this.mailGateway = mailGateway;
        this.mailBuilder = mailBuilder;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public NotificationSettingsResponse settings(Long userId) {
        User user = requireUser(userId);
        UserNotificationPrefs prefs = preferences.of(userId);
        Optional<EmailVerification> pending = verificationService.pending(userId);
        return new NotificationSettingsResponse(
                user.getNotifyEmail(),
                pending.map(EmailVerification::getEmail).orElse(null),
                pending.map(EmailVerification::getExpiresAt).orElse(null),
                mailGateway.isConfigured(),
                prefs.isEmailEnabled(),
                prefs.isCountdownEnabled(),
                prefs.isMemberEnabled(),
                prefs.isExpenseEnabled());
    }

    @Transactional
    public NotificationSettingsResponse updatePrefs(Long userId, NotificationPrefsRequest request) {
        requireUser(userId);
        UserNotificationPrefs prefs = loadOrDefault(userId);
        prefs.setEmailEnabled(request.emailEnabled());
        prefs.setCountdownEnabled(request.countdownEnabled());
        prefs.setMemberEnabled(request.memberEnabled());
        prefs.setExpenseEnabled(request.expenseEnabled());
        prefs.setUpdatedAt(clock.instant());
        prefsRepository.save(prefs);
        return settings(userId);
    }

    /** Gửi đồng bộ 1 mail thử tới email nhận thông báo. */
    public void sendTestEmail(Long userId) {
        User user = requireUser(userId);
        if (user.getNotifyEmail() == null) {
            throw new BusinessException(ErrorCode.NOTIFY_EMAIL_REQUIRED);
        }
        if (!mailGateway.isConfigured()) {
            throw new BusinessException(ErrorCode.MAIL_NOT_CONFIGURED);
        }
        Instant now = clock.instant();
        Instant last = lastTestEmail.get(userId);
        if (last != null && now.isBefore(last.plus(TEST_COOLDOWN))) {
            throw new BusinessException(ErrorCode.TEST_EMAIL_COOLDOWN);
        }
        lastTestEmail.put(userId, now);
        try {
            mailGateway.send(mailBuilder.testEmail(userId, user.getNotifyEmail(), user.getDisplayName()));
        } catch (MailDeliveryException e) {
            log.warn("Không gửi được mail thử cho user {}: {}", userId, e.getMessage());
            throw new BusinessException(ErrorCode.MAIL_SEND_FAILED);
        }
    }

    /** Áp dụng token huỷ nhận trong link email. Idempotent. */
    @Transactional
    public UnsubscribeResponse unsubscribe(String token) {
        Claims claims = unsubscribeTokens.verify(token == null ? null : token.trim())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_UNSUBSCRIBE_TOKEN));
        long userId = claims.userId();
        if (!userRepository.existsById(userId)) {
            throw new BusinessException(ErrorCode.INVALID_UNSUBSCRIBE_TOKEN);
        }
        Scope scope = claims.scope();
        switch (scope.kind()) {
            case ALL -> changePrefs(userId, prefs -> prefs.setEmailEnabled(false));
            case CATEGORY -> changePrefs(userId, prefs -> prefs.setCategoryEnabled(scope.category(), false));
            case TRIP -> muteTrip(scope.tripId(), userId);
        }
        String tripTitle = scope.kind() == Scope.Kind.TRIP
                ? tripRepository.findById(scope.tripId()).map(Trip::getTitle).orElse(null) : null;
        return new UnsubscribeResponse(scope.kind().name(),
                scope.category() == null ? null : scope.category().name(), tripTitle);
    }

    /** Thêm dòng mute nếu còn là thành viên (đã rời nhóm thì coi như xong). */
    private void muteTrip(Long tripId, Long userId) {
        TripNotificationMuteId id = new TripNotificationMuteId(tripId, userId);
        if (memberRepository.findMember(tripId, userId).isPresent() && !muteRepository.existsById(id)) {
            muteRepository.save(new TripNotificationMute(tripId, userId, clock.instant()));
        }
    }

    private void changePrefs(Long userId, Consumer<UserNotificationPrefs> change) {
        UserNotificationPrefs prefs = loadOrDefault(userId);
        change.accept(prefs);
        prefs.setUpdatedAt(clock.instant());
        prefsRepository.save(prefs);
    }

    private UserNotificationPrefs loadOrDefault(Long userId) {
        return prefsRepository.findById(userId).orElseGet(() -> UserNotificationPrefs.defaults(userId, clock.instant()));
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }
}
