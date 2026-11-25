package com.tripplanner.notification.mail;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Định dạng tiếng Việt dùng trong email (đưa vào template dưới tên biến {@code fmt}). */
public final class MailFormat {

    public static final MailFormat INSTANCE = new MailFormat();

    private static final Locale VI = Locale.forLanguageTag("vi-VN");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String[] WEEKDAYS = {"Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"};

    private MailFormat() {
    }

    /** 250000 → "250.000 ₫" */
    public String money(long amount) {
        return NumberFormat.getIntegerInstance(VI).format(amount) + " ₫";
    }

    /** 2026-12-05 → "Thứ Bảy, 05/12/2026" */
    public String date(LocalDate date) {
        return WEEKDAYS[date.getDayOfWeek().getValue() - 1] + ", " + DATE.format(date);
    }

    /** 2026-12-05 → "T7 05/12" (dòng thời tiết trong email đếm ngược) */
    public String weekdayShortDate(LocalDate date) {
        int dow = date.getDayOfWeek().getValue();   // 1 = Thứ Hai … 7 = Chủ Nhật
        String weekday = dow == 7 ? "CN" : "T" + (dow + 1);
        return weekday + " " + String.format("%02d/%02d", date.getDayOfMonth(), date.getMonthValue());
    }

    /** 2026-12-05 → "05/12/2026" */
    public String shortDate(LocalDate date) {
        return DATE.format(date);
    }
}
