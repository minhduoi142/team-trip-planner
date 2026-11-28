package com.tripplanner.packing;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Khóa so trùng tên món (pure, đồng bộ với frontend/src/lib/packingNames.ts): bỏ dấu tiếng Việt, đ → d,
 * chữ thường, gộp khoảng trắng. "Kem chống nắng" và "kem  chong nang" cho cùng khóa.
 */
public final class PackingNames {

    private static final Pattern MARKS = Pattern.compile("\\p{M}+");
    private static final Pattern SPACES = Pattern.compile("\\s+");

    private PackingNames() {
    }

    public static String key(String name) {
        if (name == null) {
            return "";
        }
        String noMarks = MARKS.matcher(Normalizer.normalize(name, Normalizer.Form.NFD)).replaceAll("");
        return SPACES.matcher(noMarks.replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT).trim())
                .replaceAll(" ");
    }
}
