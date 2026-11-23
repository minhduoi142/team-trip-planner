package com.tripplanner.auth.refresh;

import com.tripplanner.auth.refresh.RefreshTokenService.IssuedRefreshToken;
import com.tripplanner.config.AppProperties;
import java.time.Clock;
import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Cookie chứa refresh token: HttpOnly (JS không đọc được), Path chỉ /api/v1/auth (không đi kèm mọi API),
 * SameSite=Strict (chặn CSRF), Secure (cấu hình được).
 */
@Component
public class RefreshTokenCookies {

    public static final String NAME = "tp_rt";
    public static final String PATH = "/api/v1/auth";

    private final AppProperties.Auth auth;
    private final Clock clock;

    public RefreshTokenCookies(AppProperties properties, Clock clock) {
        this.auth = properties.auth();
        this.clock = clock;
    }

    public ResponseCookie issue(IssuedRefreshToken token) {
        Duration maxAge = Duration.between(clock.instant(), token.expiresAt());
        return base(token.value()).maxAge(maxAge.isNegative() ? Duration.ZERO : maxAge).build();
    }

    public ResponseCookie clear() {
        return base("").maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(auth.cookieSecure())
                .sameSite(auth.cookieSameSite())
                .path(PATH);
    }
}
