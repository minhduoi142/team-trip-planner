package com.tripplanner.trip.dto;

import com.tripplanner.user.User;

/** Thông tin rút gọn để vẽ avatar xếp chồng trên thẻ chuyến đi. */
public record MemberPreview(Long userId, String displayName, String avatarUrl) {

    public static MemberPreview from(User user) {
        return new MemberPreview(user.getId(), user.getDisplayName(), user.getAvatarUrl());
    }
}
