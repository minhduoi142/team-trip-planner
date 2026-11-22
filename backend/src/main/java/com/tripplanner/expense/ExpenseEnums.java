package com.tripplanner.expense;

/** Enum của package expense (gom 1 file). */
public final class ExpenseEnums {

    private ExpenseEnums() {
    }

    public enum Category { FOOD, TRANSPORT, STAY, TICKET, SHOPPING, OTHER }

    public enum SplitMode { EQUAL, CUSTOM }

    /** PENDING: người chuyển báo đã chuyển; CONFIRMED: người nhận xác nhận (mới tính vào số dư). */
    public enum SettlementStatus { PENDING, CONFIRMED }
}
