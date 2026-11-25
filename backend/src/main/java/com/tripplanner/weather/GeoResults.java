package com.tripplanner.weather;

import com.tripplanner.weather.model.GeoPlace;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Gộp kết quả tìm địa điểm của nhiều nguồn (thuần, có unit test): bỏ trùng (cùng tên sau khi bỏ tiền tố hành chính
 * và cách nhau dưới ~11 km), rồi xếp: Việt Nam trước → đúng tên từ khóa → chứa từ khóa → còn lại; cùng hạng thì giữ
 * thứ tự của nguồn. Cắt còn {@code limit}.
 */
final class GeoResults {

    /** ~11 km: cùng tên mà gần hơn mức này coi là 1 nơi (vd "Mộc Châu" và "Phường Mộc Châu"). */
    private static final BigDecimal SAME_PLACE_DEGREES = new BigDecimal("0.1");
    /** So khớp trên chữ CÓ dấu (chữ thường, NFC): bỏ dấu trước thì "Xa Lộ" bị nhầm là "Xã …". */
    private static final Pattern ADMIN_PREFIX = Pattern.compile(
            "^(tỉnh|thành phố|thị xã|thị trấn|huyện|quận|phường|xã|đặc khu) ");
    private static final Pattern MARKS = Pattern.compile("\\p{M}+");

    private GeoResults() {
    }

    static List<GeoPlace> merge(String query, List<GeoPlace> primary, List<GeoPlace> secondary, int limit) {
        List<GeoPlace> all = new ArrayList<>(primary);
        all.addAll(secondary);
        List<GeoPlace> unique = new ArrayList<>();
        for (GeoPlace place : all) {
            if (unique.stream().noneMatch(kept -> samePlace(kept, place))) {
                unique.add(place);
            }
        }
        String wanted = key(query);
        // Sắp xếp ổn định: cùng hạng giữ nguyên thứ tự của nguồn
        unique.sort(Comparator.<GeoPlace>comparingInt(p -> "VN".equalsIgnoreCase(p.countryCode()) ? 0 : 1)
                .thenComparingInt(p -> matchRank(key(p.name()), wanted)));
        return List.copyOf(unique.subList(0, Math.min(limit, unique.size())));
    }

    /** 0: đúng tên, 1: tên chứa từ khóa, 2: không khớp (vd tìm "Pù Luông" ra "Phu Lương"). */
    static int matchRank(String nameKey, String queryKey) {
        if (nameKey.equals(queryKey)) {
            return 0;
        }
        return nameKey.contains(queryKey) ? 1 : 2;
    }

    static boolean samePlace(GeoPlace a, GeoPlace b) {
        return key(a.name()).equals(key(b.name()))
                && a.lat().subtract(b.lat()).abs().compareTo(SAME_PLACE_DEGREES) < 0
                && a.lon().subtract(b.lon()).abs().compareTo(SAME_PLACE_DEGREES) < 0;
    }

    /** "Phường Mộc Châu" → "moc chau" (bỏ dấu, chữ thường, bỏ tiền tố hành chính). */
    static String key(String name) {
        String lower = Normalizer.normalize(name, Normalizer.Form.NFC)
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", " ")
                .trim();
        String withoutPrefix = ADMIN_PREFIX.matcher(lower).replaceFirst("");
        return MARKS.matcher(Normalizer.normalize(withoutPrefix.replace('đ', 'd'), Normalizer.Form.NFD))
                .replaceAll("");
    }
}
