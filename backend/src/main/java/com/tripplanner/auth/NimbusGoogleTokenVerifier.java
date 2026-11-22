package com.tripplanner.auth;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.config.AppProperties;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

/**
 * Verify chữ ký Google ID token bằng JWKS công khai của Google, kiểm tra {@code iss}, {@code aud},
 * {@code exp} và {@code email_verified}. Decoder này KHÔNG phải bean để không đụng với JwtDecoder
 * của hệ thống.
 */
@Slf4j
@Component
public class NimbusGoogleTokenVerifier implements GoogleTokenVerifier {

    private static final String JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    private final AppProperties.Google google;
    private final NimbusJwtDecoder decoder;

    public NimbusGoogleTokenVerifier(AppProperties properties) {
        this.google = properties.google();
        this.decoder = NimbusJwtDecoder.withJwkSetUri(JWKS_URI).jwsAlgorithm(SignatureAlgorithm.RS256).build();
        this.decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(), this::validateIssuerAndAudience));
    }

    @Override
    public GoogleProfile verify(String idToken) {
        if (!google.isConfigured()) {
            throw new BusinessException(ErrorCode.GOOGLE_LOGIN_NOT_CONFIGURED);
        }
        Jwt jwt;
        try {
            jwt = decoder.decode(idToken);
        } catch (JwtException e) {
            log.debug("Google ID token rejected: {}", e.getMessage());
            throw new BusinessException(ErrorCode.INVALID_GOOGLE_TOKEN);
        }
        if (!Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))) {
            throw new BusinessException(ErrorCode.INVALID_GOOGLE_TOKEN, "Email Google chưa được xác minh");
        }
        return new GoogleProfile(
                jwt.getSubject(),
                jwt.getClaimAsString("email"),
                jwt.getClaimAsString("name"),
                jwt.getClaimAsString("picture"));
    }

    private OAuth2TokenValidatorResult validateIssuerAndAudience(Jwt jwt) {
        String issuer = jwt.getClaimAsString("iss");
        if (issuer == null || !ISSUERS.contains(issuer)) {
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid issuer", null));
        }
        if (jwt.getAudience() == null || !jwt.getAudience().contains(google.clientId())) {
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid audience", null));
        }
        return OAuth2TokenValidatorResult.success();
    }
}
