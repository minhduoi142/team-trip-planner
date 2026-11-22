package com.tripplanner.trip.dto;

import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripRole;
import java.time.Instant;

public record TripMemberResponse(Long userId, String displayName, String avatarUrl, TripRole role, Instant joinedAt) {

    public static TripMemberResponse from(TripMember member) {
        return new TripMemberResponse(
                member.getUser().getId(),
                member.getUser().getDisplayName(),
                member.getUser().getAvatarUrl(),
                member.getRole(),
                member.getJoinedAt());
    }
}
