package com.tripplanner.common;

import java.text.Normalizer;
import java.util.Locale;

public final class TextNormalizer {

    private TextNormalizer() {
    }

    /** "Nguyễn Thị  Linh" → "NGUYEN THI LINH" (bỏ dấu, đ→D, in hoa, gộp khoảng trắng). */
    public static String toUpperAscii(String value) {
        if (value == null) {
            return null;
        }
        String noMarks = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return noMarks.trim().replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }
}
