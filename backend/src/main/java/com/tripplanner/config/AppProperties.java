package com.tripplanner.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
/**
 * {@code frontendUrl}: nơi trang /share chuyển người dùng tới (vd http://localhost:5173).
 * {@code publicBaseUrl}: địa chỉ công khai của backend, dùng cho URL tuyệt đối trong thẻ og:image.
 */
public record AppProperties(Jwt jwt, Auth auth, Google google, Cors cors, String timezone, Storage storage,
                            String frontendUrl, String publicBaseUrl, Mail mail, Notifications notifications,
                            Weather weather) {

    /** Người gửi email. {@code from} trống thì dùng {@code spring.mail.username}. */
    public record Mail(String from, String fromName) {
    }

    /**
     * Thông báo email (docs/sdd-email-notifications.md). {@code schedulerEnabled=false} (profile test) tắt mọi
     * job @Scheduled của thông báo; test gọi trực tiếp {@code runOnce()}.
     */
    public record Notifications(boolean schedulerEnabled, long dispatchIntervalMs, int batchSize, int dailyLimit,
                         int delayMinutes, List<Integer> countdownDays, String countdownCron) {
    }

    /**
     * Dự báo thời tiết Open-Meteo (docs/sdd-weather.md). {@code apiKey} trống = gói miễn phí.
     * {@code photonUrl}: tìm địa điểm chi tiết (OpenStreetMap); trống = chỉ dùng geocoding của Open-Meteo.
     * Cache trong bộ nhớ: tươi {@code cacheTtlMinutes}, dùng bản cũ tối đa {@code staleMaxHours} khi API lỗi,
     * nhớ lỗi {@code negativeTtlSeconds}, tối đa {@code maxEntries} vị trí.
     */
    public record Weather(boolean enabled, String forecastUrl, String geocodingUrl, String photonUrl,
                          String archiveUrl, String apiKey,
                          int forecastDays, int cacheTtlMinutes, int staleMaxHours, int negativeTtlSeconds,
                          int maxEntries, int connectTimeoutMs, int readTimeoutMs) {
    }

    /** Kho ảnh chuẩn S3. {@code publicUrl}: địa chỉ trình duyệt dùng để tải ảnh (mặc định = endpoint). */
    public record Storage(String endpoint, String accessKey, String secretKey, String bucket, String publicUrl) {

        public boolean isConfigured() {
            return endpoint != null && !endpoint.isBlank();
        }

        public String effectivePublicUrl() {
            String base = publicUrl != null && !publicUrl.isBlank() ? publicUrl : endpoint;
            return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        }
    }

    /** Access token JWT: sống ngắn, FE chỉ giữ trong bộ nhớ. */
    public record Jwt(String secret, int accessTtlMinutes) {
    }

    /**
     * Refresh token (docs/sdd-refresh-token.md): hạn trượt {@code refreshTtlDays}, hạn tuyệt đối của họ
     * {@code familyMaxDays}, grace window cho 2 tab làm mới cùng lúc {@code reuseGraceSeconds}.
     */
    public record Auth(int refreshTtlDays, int familyMaxDays, int reuseGraceSeconds,
                       boolean cookieSecure, String cookieSameSite) {
    }

    public record Google(String clientId) {

        public boolean isConfigured() {
            return clientId != null && !clientId.isBlank();
        }
    }

    public record Cors(List<String> allowedOrigins) {
    }
}
