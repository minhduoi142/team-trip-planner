package com.tripplanner.notification;

public enum NotificationStatus {
    /** Chờ tới send_after (hoặc chờ thử lại). */
    PENDING,
    /** Dispatcher đã nhận, đang gửi (kẹt quá 10 phút thì được trả về PENDING). */
    SENDING,
    SENT,
    /** Không gửi: không có email, đã tắt loại/chuyến, hoặc máy chủ chưa cấu hình mail. */
    SKIPPED,
    /** Bị thay bằng dòng mới hơn hoặc sự kiện bị huỷ trong cửa sổ chờ. */
    CANCELLED,
    /** Gửi lỗi quá số lần thử. */
    FAILED
}
