package com.tripplanner.auth;

import com.tripplanner.auth.AuthService.AuthSession;
import com.tripplanner.auth.dto.AuthResponse;
import com.tripplanner.auth.dto.GoogleLoginRequest;
import com.tripplanner.auth.dto.LoginRequest;
import com.tripplanner.auth.dto.RegisterRequest;
import com.tripplanner.auth.refresh.RefreshTokenCookies;
import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Đăng nhập trả access token (body, sống ngắn) + refresh token (cookie HttpOnly {@value RefreshTokenCookies#NAME}).
 * Xem docs/sdd-refresh-token.md.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Đăng ký, đăng nhập username/password và Google, làm mới / đăng xuất phiên")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookies cookies;

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản username/password")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                                 @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent) {
        return withCookie(HttpStatus.CREATED, authService.register(request, userAgent));
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập bằng username/password")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent) {
        return withCookie(HttpStatus.OK, authService.login(request, userAgent));
    }

    @PostMapping("/google")
    @Operation(summary = "Đăng nhập bằng Google ID token (lấy từ Google Identity Services)")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleLoginRequest request,
                                               @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent) {
        return withCookie(HttpStatus.OK, authService.loginWithGoogle(request, userAgent));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Làm mới phiên: đổi refresh token (cookie) lấy access token mới, refresh token cũ hết hiệu lực")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = RefreshTokenCookies.NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        try {
            return withCookie(HttpStatus.OK, authService.refresh(refreshToken));
        } catch (BusinessException e) {
            // STALE: tab khác vừa xoay, cookie hiện tại của trình duyệt đã là token mới → không xóa
            if (e.getErrorCode() != ErrorCode.REFRESH_TOKEN_STALE) {
                response.addHeader(HttpHeaders.SET_COOKIE, cookies.clear().toString());
            }
            throw e;
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất trình duyệt này: thu hồi họ refresh token, xóa cookie")
    public ResponseEntity<Void> logout(@CookieValue(name = RefreshTokenCookies.NAME, required = false) String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear().toString()).build();
    }

    @PostMapping("/logout-all")
    @SecurityRequirement(name = OpenApiConfig.BEARER)
    @Operation(summary = "Đăng xuất mọi thiết bị: thu hồi mọi họ refresh token của tài khoản")
    public ResponseEntity<Void> logoutAll(@AuthenticationPrincipal Jwt jwt) {
        authService.logoutAll(CurrentUser.id(jwt));
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear().toString()).build();
    }

    private ResponseEntity<AuthResponse> withCookie(HttpStatus status, AuthSession session) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, cookies.issue(session.refreshToken()).toString())
                .body(session.body());
    }
}
