package com.tripplanner.notification;

/** Mỗi email chỉ chứa 1 kênh: đếm ngược đi riêng, các sự kiện còn lại gộp thành email tóm tắt. */
public enum NotificationChannel {
    COUNTDOWN, DIGEST
}
