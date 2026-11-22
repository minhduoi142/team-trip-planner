package com.tripplanner.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
        @NotBlank(message = "Thiếu Google ID token")
        String idToken) {
}
