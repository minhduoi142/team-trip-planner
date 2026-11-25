package com.tripplanner.weather;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.weather.model.GeoPlace;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.client.RestClient;

/**
 * Tìm địa điểm chi tiết qua Photon (komoot, dữ liệu OpenStreetMap): có cả làng/bản, xã, thác, hồ, núi, khu bảo tồn
 * mà Open-Meteo (GeoNames) thiếu, vd "Tà Xùa", "Hồ Ba Bể". Photon được làm cho ô gõ-gợi-ý (khác Nominatim cấm việc
 * này). Kết quả không phải nơi đến du lịch (đường, cửa hàng, khách sạn…) bị lọc bỏ theo {@link #KINDS}.
 */
@Slf4j
class PhotonGeocoder {

    /** Gửi kèm theo điều khoản dùng chung của máy chủ Photon công cộng; không chứa thông tin người dùng. */
    static final String USER_AGENT = "TeamTripPlanner/1.0 (trip planning app; weather place search)";
    static final int FETCH_LIMIT = 15;

    /** osm_key:osm_value → loại địa điểm tiếng Việt. Không có trong bảng = bỏ. */
    static final Map<String, String> KINDS = Map.ofEntries(
            Map.entry("place:country", "Quốc gia"),
            Map.entry("place:state", "Tỉnh/bang"),
            Map.entry("place:province", "Tỉnh/bang"),
            Map.entry("place:region", "Vùng"),
            Map.entry("place:county", "Quận/huyện"),
            Map.entry("place:district", "Quận/huyện"),
            Map.entry("place:municipality", "Quận/huyện"),
            Map.entry("place:city", "Thành phố"),
            Map.entry("place:town", "Thị trấn"),
            Map.entry("place:village", "Làng/bản"),
            Map.entry("place:hamlet", "Thôn/bản"),
            Map.entry("place:suburb", "Khu vực"),
            Map.entry("place:quarter", "Khu vực"),
            Map.entry("place:neighbourhood", "Khu vực"),
            Map.entry("place:locality", "Địa danh"),
            Map.entry("place:island", "Đảo"),
            Map.entry("place:islet", "Đảo"),
            Map.entry("place:archipelago", "Quần đảo"),
            Map.entry("boundary:administrative", "Đơn vị hành chính"),
            Map.entry("boundary:historic", "Địa danh cũ"),
            Map.entry("boundary:national_park", "Vườn quốc gia"),
            Map.entry("boundary:protected_area", "Khu bảo tồn"),
            Map.entry("leisure:nature_reserve", "Khu bảo tồn"),
            Map.entry("leisure:park", "Công viên"),
            Map.entry("leisure:beach_resort", "Khu nghỉ biển"),
            Map.entry("natural:peak", "Núi"),
            Map.entry("natural:volcano", "Núi lửa"),
            Map.entry("natural:hill", "Đồi"),
            Map.entry("natural:ridge", "Dãy núi"),
            Map.entry("natural:valley", "Thung lũng"),
            Map.entry("natural:water", "Hồ"),
            Map.entry("natural:lake", "Hồ"),
            Map.entry("water:lake", "Hồ"),
            Map.entry("water:reservoir", "Hồ"),
            Map.entry("water:lagoon", "Đầm phá"),
            Map.entry("natural:bay", "Vịnh"),
            Map.entry("natural:beach", "Bãi biển"),
            Map.entry("natural:cape", "Mũi"),
            Map.entry("natural:cliff", "Vách đá"),
            Map.entry("natural:cave_entrance", "Hang động"),
            Map.entry("natural:island", "Đảo"),
            Map.entry("natural:strait", "Eo biển"),
            Map.entry("natural:wood", "Rừng"),
            Map.entry("natural:glacier", "Sông băng"),
            Map.entry("waterway:waterfall", "Thác nước"),
            Map.entry("tourism:attraction", "Điểm tham quan"),
            Map.entry("tourism:viewpoint", "Điểm ngắm cảnh"),
            Map.entry("tourism:theme_park", "Khu vui chơi"),
            Map.entry("tourism:camp_site", "Khu cắm trại"));

    private final RestClient http;
    private final String url;

    PhotonGeocoder(RestClient http, String url) {
        this.http = http;
        this.url = url;
    }

    List<GeoPlace> search(String query) {
        JsonNode root;
        try {
            root = http.get()
                    .uri(url, b -> b.queryParam("q", "{q}").queryParam("limit", FETCH_LIMIT).build(Map.of("q", query)))
                    .header("User-Agent", USER_AGENT)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RuntimeException e) {
            log.warn("Photon: không tìm được địa điểm ({}: {})", e.getClass().getSimpleName(), e.getMessage());
            throw new WeatherUnavailableException("Photon lỗi", e);
        }
        if (root == null || !root.path("features").isArray()) {
            throw new WeatherUnavailableException("Photon trả dữ liệu lạ");
        }
        List<GeoPlace> places = new ArrayList<>();
        for (JsonNode feature : root.path("features")) {
            GeoPlace place = toPlace(feature);
            if (place != null) {
                places.add(place);
            }
        }
        return places;
    }

    /** 1 feature GeoJSON → địa điểm; null nếu không phải nơi đến (theo {@link #KINDS}) hoặc thiếu tên/tọa độ. */
    static GeoPlace toPlace(JsonNode feature) {
        JsonNode p = feature.path("properties");
        String kind = KINDS.get(p.path("osm_key").asText() + ":" + p.path("osm_value").asText());
        String name = text(p.get("name"));
        JsonNode coords = feature.path("geometry").path("coordinates");   // GeoJSON: [lon, lat]
        if (kind == null || name == null || !coords.path(0).isNumber() || !coords.path(1).isNumber()) {
            return null;
        }
        String area = firstText(p, "district", "county", "city");
        if (area != null && GeoResults.key(area).equals(GeoResults.key(name))) {
            area = null;
        }
        String region = text(p.get("state"));
        if (region != null && GeoResults.key(region).equals(GeoResults.key(name))) {
            region = null;
        }
        return new GeoPlace(name, area, region, text(p.get("country")), text(p.get("countrycode")), kind,
                decimal(coords.path(1)), decimal(coords.path(0)));
    }

    private static String firstText(JsonNode p, String... fields) {
        for (String field : fields) {
            String value = text(p.get(field));
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private static String text(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        String value = node.asText().trim();
        return value.isEmpty() ? null : OpenMeteoProvider.normalize(value);
    }

    private static BigDecimal decimal(JsonNode node) {
        return node.decimalValue();
    }
}
