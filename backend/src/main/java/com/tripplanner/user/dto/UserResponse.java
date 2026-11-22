package com.tripplanner.user.dto;

import com.tripplanner.user.User;

public record UserResponse(
        Long id,
        String displayName,
        String username,
        String email,
        String avatarUrl,
        boolean hasGoogle,
        boolean hasPassword) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getDisplayName(),
                user.getUsername(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getGoogleSub() != null,
                user.getPasswordHash() != null);
    }
}
