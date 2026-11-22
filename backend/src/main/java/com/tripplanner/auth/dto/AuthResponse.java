package com.tripplanner.auth.dto;

import com.tripplanner.user.dto.UserResponse;
import java.time.Instant;

public record AuthResponse(String accessToken, Instant expiresAt, UserResponse user) {
}
