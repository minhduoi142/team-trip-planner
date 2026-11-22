package com.tripplanner.media;

import lombok.Getter;

/** Ảnh upload dùng cho đâu; quyết định thư mục trong bucket. */
@Getter
public enum MediaPurpose {
    TRIP_COVER("cover"),
    AVATAR("avatar"),
    DRESS_CODE("dress-code"),
    RECEIPT("receipt");

    private final String folder;

    MediaPurpose(String folder) {
        this.folder = folder;
    }
}
