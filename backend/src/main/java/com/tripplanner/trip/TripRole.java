package com.tripplanner.trip;

/** Thứ tự khai báo = thứ bậc quyền: VIEWER &lt; EDITOR &lt; OWNER. */
public enum TripRole {
    VIEWER,
    EDITOR,
    OWNER;

    public boolean atLeast(TripRole required) {
        return this.ordinal() >= required.ordinal();
    }
}
