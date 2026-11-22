package com.tripplanner.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, Google google, Cors cors, String timezone) {

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
