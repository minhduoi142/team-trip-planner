package com.tripplanner.auth;

import com.tripplanner.auth.GoogleTokenVerifier.GoogleProfile;
import com.tripplanner.auth.dto.AuthResponse;
import com.tripplanner.auth.dto.GoogleLoginRequest;
import com.tripplanner.auth.dto.LoginRequest;
import com.tripplanner.auth.dto.RegisterRequest;
import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import com.tripplanner.user.dto.UserResponse;
import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AuthService {

    /** BCrypt của một chuỗi ngẫu nhiên: so khớp giả khi username không tồn tại để thời gian phản hồi như nhau. */
    private static final String DUMMY_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5BWX4Z3uGTb0Xu0lzOQOEuNlRHZZ6";
    private static final int MAX_DISPLAY_NAME = 100;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = normalizeUsername(request.username());
        if (userRepository.existsByUsername(username)) {
            throw new BusinessException(ErrorCode.USERNAME_TAKEN);
        }
        User user = userRepository.save(User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(request.password()))
                .displayName(request.displayName().trim())
                .build());
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Optional<User> found = userRepository.findByUsername(normalizeUsername(request.username()));
        String hash = found.map(User::getPasswordHash).orElse(null);
        boolean matches = passwordEncoder.matches(request.password(), hash != null ? hash : DUMMY_HASH);
        if (found.isEmpty() || hash == null || !matches) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        return toResponse(found.get());
    }

    /**
     * Tìm theo google_sub → theo email (liên kết vào tài khoản sẵn có) → tạo mới.
     */
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleProfile profile = googleTokenVerifier.verify(request.idToken());
        String email = StringUtils.hasText(profile.email()) ? profile.email().toLowerCase(Locale.ROOT) : null;

        User user = userRepository.findByGoogleSub(profile.subject())
                .or(() -> email == null ? Optional.empty() : userRepository.findByEmail(email))
                .map(existing -> linkGoogle(existing, profile))
                .orElseGet(() -> userRepository.save(User.builder()
                        .googleSub(profile.subject())
                        .email(email)
                        .displayName(displayNameFrom(profile, email))
                        .avatarUrl(profile.pictureUrl())
                        .build()));
        return toResponse(user);
    }

    private User linkGoogle(User user, GoogleProfile profile) {
        if (user.getGoogleSub() == null) {
            user.setGoogleSub(profile.subject());
        }
        if (user.getAvatarUrl() == null && profile.pictureUrl() != null) {
            user.setAvatarUrl(profile.pictureUrl());
        }
        return user;
    }

    private static String displayNameFrom(GoogleProfile profile, String email) {
        String name = StringUtils.hasText(profile.name()) ? profile.name().trim()
                : email != null ? email.substring(0, email.indexOf('@')) : "Thành viên";
        return name.length() > MAX_DISPLAY_NAME ? name.substring(0, MAX_DISPLAY_NAME) : name;
    }

    private static String normalizeUsername(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }

    private AuthResponse toResponse(User user) {
        JwtService.IssuedToken token = jwtService.issue(user);
        return new AuthResponse(token.value(), token.expiresAt(), UserResponse.from(user));
    }
}
