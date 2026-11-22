package com.tripplanner.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
/**
 * {@code frontendUrl}: nơi trang /share chuyển người dùng tới (vd http://localhost:5173).
 * {@code publicBaseUrl}: địa chỉ công khai của backend, dùng cho URL tuyệt đối trong thẻ og:image.
 */
public record AppProperties(Jwt jwt, Google google, Cors cors, String timezone, Storage storage,
                            String frontendUrl, String publicBaseUrl) {

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

    public record Jwt(String secret, int expirationDays) {
    }

    public record Google(String clientId) {

        public boolean isConfigured() {
            return clientId != null && !clientId.isBlank();
        }
    }

    public record Cors(List<String> allowedOrigins) {
    }
}
