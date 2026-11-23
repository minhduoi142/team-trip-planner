package com.tripplanner.notification;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Token huỷ nhận trong link email: {@code base64url(payload).base64url(HMAC-SHA256(key, payload))},
 * {@code payload = "u1|{userId}|{scope}"}. Không hết hạn (link trong mail cũ vẫn dùng được).
 * <p>
 * Khoá dẫn xuất {@code HMAC-SHA256(appSecret, "unsubscribe-v1")}, không dùng trực tiếp JWT_SECRET. Cố ý KHÔNG dùng
 * JWT: một JWT ký bằng khoá app sẽ được resource server chấp nhận như access token.
 */
public final class UnsubscribeTokens {

    private static final String ALGORITHM = "HmacSHA256";
    private static final String VERSION = "u1";
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final byte[] key;

    public UnsubscribeTokens(String appSecret) {
        if (appSecret == null || appSecret.isEmpty()) {
            throw new IllegalArgumentException("Thiếu secret để ký token huỷ nhận");
        }
        this.key = hmac(appSecret.getBytes(StandardCharsets.UTF_8),
                "unsubscribe-v1".getBytes(StandardCharsets.UTF_8));
    }

    /** Phạm vi huỷ: mọi email, 1 loại, hoặc 1 chuyến. */
    public record Scope(Kind kind, NotificationCategory category, Long tripId) {

        public enum Kind { ALL, CATEGORY, TRIP }

        public static Scope all() {
            return new Scope(Kind.ALL, null, null);
        }

        public static Scope category(NotificationCategory category) {
            return new Scope(Kind.CATEGORY, category, null);
        }

        public static Scope trip(long tripId) {
            return new Scope(Kind.TRIP, null, tripId);
        }

        String encode() {
            return switch (kind) {
                case ALL -> "ALL";
                case CATEGORY -> "CAT:" + category.name();
                case TRIP -> "TRIP:" + tripId;
            };
        }

        static Optional<Scope> decode(String value) {
            try {
                if (value.equals("ALL")) {
                    return Optional.of(all());
                }
                if (value.startsWith("CAT:")) {
                    return Optional.of(category(NotificationCategory.valueOf(value.substring(4))));
                }
                if (value.startsWith("TRIP:")) {
                    long tripId = Long.parseLong(value.substring(5));
                    return tripId > 0 ? Optional.of(trip(tripId)) : Optional.empty();
                }
            } catch (IllegalArgumentException e) {   // gồm cả NumberFormatException
                return Optional.empty();
            }
            return Optional.empty();
        }
    }

    public record Claims(long userId, Scope scope) {
    }

    public String sign(long userId, Scope scope) {
        return signPayload(VERSION + "|" + userId + "|" + scope.encode());
    }

    /** Ký 1 payload bất kỳ (package-private để unit test ký payload sai định dạng). */
    String signPayload(String payloadText) {
        byte[] payload = payloadText.getBytes(StandardCharsets.UTF_8);
        return ENCODER.encodeToString(payload) + "." + ENCODER.encodeToString(hmac(key, payload));
    }

    public Optional<Claims> verify(String token) {
        if (token == null) {
            return Optional.empty();
        }
        int dot = token.indexOf('.');
        if (dot <= 0 || dot != token.lastIndexOf('.')) {
            return Optional.empty();
        }
        byte[] payload;
        byte[] signature;
        try {
            payload = DECODER.decode(token.substring(0, dot));
            signature = DECODER.decode(token.substring(dot + 1));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        if (!MessageDigest.isEqual(hmac(key, payload), signature)) {
            return Optional.empty();
        }
        String[] parts = new String(payload, StandardCharsets.UTF_8).split("\\|", -1);
        if (parts.length != 3 || !parts[0].equals(VERSION)) {
            return Optional.empty();
        }
        try {
            long userId = Long.parseLong(parts[1]);
            return userId > 0 ? Scope.decode(parts[2]).map(scope -> new Claims(userId, scope)) : Optional.empty();
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private static byte[] hmac(byte[] key, byte[] data) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(key, ALGORITHM));
            return mac.doFinal(data);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Không khởi tạo được HmacSHA256", e);
        }
    }
}
