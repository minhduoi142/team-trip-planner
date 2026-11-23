package com.tripplanner.auth.refresh;

/** Lý do một họ refresh token bị thu hồi. */
public enum RevokeReason {
    /** Người dùng bấm Đăng xuất trên trình duyệt này */
    LOGOUT,
    /** Người dùng bấm "Đăng xuất mọi thiết bị" */
    LOGOUT_ALL,
    /** Một refresh token đã dùng bị dùng lại ngoài grace window → coi như bị lộ */
    REUSE_DETECTED
}
