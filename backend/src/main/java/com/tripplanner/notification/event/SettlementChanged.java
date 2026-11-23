package com.tripplanner.notification.event;

/** Thay đổi một khoản chuyển tiền giữa 2 thành viên. */
public record SettlementChanged(long tripId, long settlementId, Kind kind, long fromUserId, long toUserId,
                                long amount) {

    public enum Kind {
        /** Người chuyển ghi "đã chuyển", chờ người nhận xác nhận. */
        PENDING_CREATED,
        /** Người nhận tự ghi (xác nhận ngay) hoặc bấm xác nhận khoản đang chờ. */
        CONFIRMED,
        /** Người nhận huỷ khoản đang chờ. */
        REJECTED,
        /** Người nhận xoá khoản đã xác nhận. */
        CONFIRMED_DELETED,
        /** Người chuyển tự huỷ khoản đang chờ. */
        CANCELLED_BY_SENDER
    }
}
