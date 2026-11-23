package com.tripplanner.notification.mail;

import java.util.Map;

/**
 * Mã màu + tên tiếng Việt của bảng màu dress code, để vẽ ô màu trong email. GIỮ ĐỒNG BỘ với
 * {@code frontend/src/lib/dressColors.ts} (và danh sách khoá {@code TripDayDressColor.PALETTE}).
 */
public final class DressColorStyles {

    public record Style(String hex, String label) {
    }

    private static final Map<String, Style> STYLES = Map.ofEntries(
            Map.entry("white", new Style("#ffffff", "Trắng")),
            Map.entry("black", new Style("#1f1f1f", "Đen")),
            Map.entry("beige", new Style("#e8d8c3", "Be")),
            Map.entry("brown", new Style("#8b5e3c", "Nâu")),
            Map.entry("pastel-pink", new Style("#f9c6d3", "Hồng pastel")),
            Map.entry("hot-pink", new Style("#ec4899", "Hồng đậm")),
            Map.entry("red", new Style("#dc2626", "Đỏ")),
            Map.entry("orange", new Style("#fb923c", "Cam")),
            Map.entry("yellow", new Style("#facc15", "Vàng")),
            Map.entry("mint", new Style("#a7f3d0", "Xanh mint")),
            Map.entry("green", new Style("#16a34a", "Xanh lá")),
            Map.entry("sky", new Style("#7dd3fc", "Xanh da trời")),
            Map.entry("navy", new Style("#1e3a8a", "Xanh navy")),
            Map.entry("lavender", new Style("#c4b5fd", "Tím lavender")),
            Map.entry("purple", new Style("#7c3aed", "Tím")),
            Map.entry("denim", new Style("#4a6fa5", "Denim")));

    private DressColorStyles() {
    }

    /** Khoá lạ (bảng màu đổi sau này) → ô xám mang đúng tên khoá. */
    public static Style of(String key) {
        return STYLES.getOrDefault(key, new Style("#cccccc", key));
    }

    static Map<String, Style> all() {
        return STYLES;
    }
}
