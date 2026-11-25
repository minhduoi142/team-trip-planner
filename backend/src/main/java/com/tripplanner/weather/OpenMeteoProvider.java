package com.tripplanner.weather;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.config.AppProperties;
import com.tripplanner.weather.model.DailyForecast;
import com.tripplanner.weather.model.GeoPlace;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.function.Function;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriBuilder;

/**
 * Gọi Open-Meteo (dự báo + geocoding) bằng {@link RestClient} + HttpClient của JDK (không thêm thư viện).
 * Tìm địa điểm gọi song song Open-Meteo (thành phố, tỉnh: xếp hạng tốt) và Photon/OpenStreetMap (làng/bản, xã,
 * thác, hồ…: chi tiết hơn), rồi gộp bằng {@link GeoResults}. Một nguồn lỗi thì dùng nguồn còn lại.
 * Mọi lỗi mạng/HTTP/JSON → {@link WeatherUnavailableException} kèm 1 dòng log WARN.
 */
@Slf4j
@Component
public class OpenMeteoProvider implements WeatherProvider {

    static final String DAILY_FIELDS = "weather_code,temperature_2m_max,temperature_2m_min,"
            + "precipitation_probability_max,precipitation_sum,wind_speed_10m_max,uv_index_max";
    private static final int SEARCH_LIMIT = 8;

    private final RestClient http;
    private final AppProperties.Weather config;
    /** null khi {@code app.weather.photon-url} trống (chỉ dùng Open-Meteo). */
    private final PhotonGeocoder photon;

    @Autowired
    public OpenMeteoProvider(RestClient.Builder builder, AppProperties properties) {
        this(builder.requestFactory(requestFactory(properties.weather())).build(), properties.weather());
    }

    /** Cho unit test: RestClient đã gắn {@code MockRestServiceServer}. */
    OpenMeteoProvider(RestClient http, AppProperties.Weather config) {
        this.http = http;
        this.config = config;
        this.photon = StringUtils.hasText(config.photonUrl()) ? new PhotonGeocoder(http, config.photonUrl()) : null;
    }

    private static JdkClientHttpRequestFactory requestFactory(AppProperties.Weather config) {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(config.connectTimeoutMs()))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(Duration.ofMillis(config.readTimeoutMs()));
        return factory;
    }

    @Override
    public List<GeoPlace> search(String query) {
        if (photon == null) {
            return GeoResults.merge(query, searchOpenMeteo(query), List.of(), SEARCH_LIMIT);
        }
        List<GeoPlace> openMeteo;
        List<GeoPlace> osm;
        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<List<GeoPlace>> a = pool.submit(() -> searchOpenMeteo(query));
            Future<List<GeoPlace>> b = pool.submit(() -> photon.search(query));
            openMeteo = resultOrNull(a);
            osm = resultOrNull(b);
        }
        if (openMeteo == null && osm == null) {
            throw new WeatherUnavailableException("Không nguồn nào tìm được địa điểm");
        }
        return GeoResults.merge(query, openMeteo == null ? List.of() : openMeteo, osm == null ? List.of() : osm,
                SEARCH_LIMIT);
    }

    private static List<GeoPlace> resultOrNull(Future<List<GeoPlace>> task) {
        try {
            return task.get();
        } catch (ExecutionException e) {
            return null;   // đã log ở nơi gọi API
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        }
    }

    /** Geocoding của Open-Meteo (GeoNames): tốt cho thành phố/tỉnh, thiếu làng/bản và thắng cảnh nhỏ. */
    List<GeoPlace> searchOpenMeteo(String query) {
        Map<String, Object> params = new HashMap<>();
        params.put("name", query);
        JsonNode root = get("tìm địa điểm", config.geocodingUrl(), params, b -> b
                .queryParam("name", "{name}")
                .queryParam("count", SEARCH_LIMIT)
                .queryParam("language", "vi")
                .queryParam("format", "json"));
        List<GeoPlace> places = new ArrayList<>();
        for (JsonNode r : root.path("results")) {
            BigDecimal lat = decimal(r.get("latitude"));
            BigDecimal lon = decimal(r.get("longitude"));
            String name = text(r.get("name"));
            if (lat == null || lon == null || name == null) {
                continue;
            }
            String area = text(r.get("admin2"));
            if (area != null && GeoResults.key(area).equals(GeoResults.key(name))) {
                area = null;   // "Đà Lạt" trong "Thành Phố Đà Lạt": bỏ cho gọn
            }
            places.add(new GeoPlace(name, area, text(r.get("admin1")), text(r.get("country")),
                    text(r.get("country_code")), geoNamesKind(text(r.get("feature_code"))), lat, lon));
        }
        return places;
    }

    @Override
    public List<DailyForecast> forecast(Coordinates point) {
        Map<String, Object> params = new HashMap<>();
        JsonNode root = get("lấy dự báo " + point.cacheKey(), config.forecastUrl(), params, b -> b
                .queryParam("latitude", point.lat().toPlainString())
                .queryParam("longitude", point.lon().toPlainString())
                .queryParam("daily", DAILY_FIELDS)
                .queryParam("timezone", "auto")
                .queryParam("forecast_days", config.forecastDays()));
        JsonNode daily = root.path("daily");
        JsonNode time = daily.path("time");
        if (!time.isArray()) {
            throw unavailable("lấy dự báo " + point.cacheKey(), "thiếu daily.time", null);
        }
        List<DailyForecast> days = new ArrayList<>(time.size());
        for (int i = 0; i < time.size(); i++) {
            days.add(new DailyForecast(
                    LocalDate.parse(time.get(i).asText()),
                    integer(daily.path("weather_code").get(i)),
                    number(daily.path("temperature_2m_min").get(i)),
                    number(daily.path("temperature_2m_max").get(i)),
                    integer(daily.path("precipitation_probability_max").get(i)),
                    number(daily.path("precipitation_sum").get(i)),
                    number(daily.path("wind_speed_10m_max").get(i)),
                    number(daily.path("uv_index_max").get(i))));
        }
        return days;
    }

    // ---------------------------------------------------------------- helpers

    /** Mã loại địa điểm GeoNames → nhãn tiếng Việt. */
    static String geoNamesKind(String featureCode) {
        if (featureCode == null) {
            return "Địa danh";
        }
        if (featureCode.equals("PPLC")) {
            return "Thủ đô";
        }
        if (featureCode.startsWith("ADM")) {
            return "Đơn vị hành chính";
        }
        return switch (featureCode) {
            case "ISL", "ISLS" -> "Đảo";
            case "MT", "MTS", "PK" -> "Núi";
            case "LK", "LKS" -> "Hồ";
            case "BAY" -> "Vịnh";
            case "BCH" -> "Bãi biển";
            case "PRK", "RES" -> "Khu bảo tồn";
            default -> "Địa danh";
        };
    }

    private JsonNode get(String action, String url, Map<String, Object> params,
                         Function<UriBuilder, UriBuilder> query) {
        boolean withKey = StringUtils.hasText(config.apiKey());
        if (withKey) {
            params.put("apikey", config.apiKey());
        }
        try {
            // Giá trị người dùng nhập đi qua biến {name} → được mã hóa đầy đủ (kể cả & + #)
            JsonNode body = http.get()
                    .uri(url, b -> {
                        UriBuilder builder = query.apply(b);
                        if (withKey) {
                            builder.queryParam("apikey", "{apikey}");
                        }
                        return builder.build(params);
                    })
                    .retrieve()
                    .body(JsonNode.class);
            if (body == null) {
                throw unavailable(action, "phản hồi rỗng", null);
            }
            return body;
        } catch (WeatherUnavailableException e) {
            throw e;
        } catch (RuntimeException e) {
            throw unavailable(action, e.getClass().getSimpleName() + ": " + e.getMessage(), e);
        }
    }

    private static WeatherUnavailableException unavailable(String action, String reason, Throwable cause) {
        log.warn("Open-Meteo: không {} ({})", action, reason);
        return new WeatherUnavailableException("Không " + action + ": " + reason, cause);
    }

    /** GeoNames dùng Ð/ð (U+00D0/U+00F0, chữ Iceland) thay cho Đ/đ của tiếng Việt. */
    static String normalize(String s) {
        return s.replace('Ð', 'Đ').replace('ð', 'đ');
    }

    private static String text(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        String value = node.asText().trim();
        return value.isEmpty() ? null : normalize(value);
    }

    private static Double number(JsonNode node) {
        return node == null || !node.isNumber() ? null : node.asDouble();
    }

    private static Integer integer(JsonNode node) {
        return node == null || !node.isNumber() ? null : (int) Math.round(node.asDouble());
    }

    private static BigDecimal decimal(JsonNode node) {
        return node == null || !node.isNumber() ? null : node.decimalValue();
    }
}
