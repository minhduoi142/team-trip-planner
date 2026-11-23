package com.tripplanner.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.notification.UnsubscribeTokens.Claims;
import com.tripplanner.notification.UnsubscribeTokens.Scope;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class UnsubscribeTokensTest {

    private static final String SECRET = "test-only-secret-key-for-unit-tests-0123456789";
    private final UnsubscribeTokens tokens = new UnsubscribeTokens(SECRET);

    @Test
    void signThenVerifyKeepsUserAndScope() {
        assertThat(tokens.verify(tokens.sign(42, Scope.all())))
                .contains(new Claims(42, Scope.all()));
        assertThat(tokens.verify(tokens.sign(7, Scope.category(NotificationCategory.EXPENSE))))
                .contains(new Claims(7, Scope.category(NotificationCategory.EXPENSE)));
        assertThat(tokens.verify(tokens.sign(7, Scope.trip(99))))
                .contains(new Claims(7, Scope.trip(99)));
    }

    @Test
    void tamperedPayloadOrSignatureIsRejected() {
        String token = tokens.sign(42, Scope.all());
        int dot = token.indexOf('.');
        String forgedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("u1|43|ALL".getBytes(StandardCharsets.UTF_8));

        assertThat(tokens.verify(forgedPayload + token.substring(dot))).isEmpty();
        assertThat(tokens.verify(token.substring(0, dot + 1) + flipFirst(token.substring(dot + 1)))).isEmpty();
    }

    @Test
    void tokenFromAnotherSecretIsRejected() {
        UnsubscribeTokens other = new UnsubscribeTokens(SECRET + "-other");
        assertThat(tokens.verify(other.sign(42, Scope.all()))).isEmpty();
    }

    @Test
    void malformedTokensAreRejected() {
        assertThat(tokens.verify(null)).isEmpty();
        assertThat(tokens.verify("")).isEmpty();
        assertThat(tokens.verify("abc")).isEmpty();
        assertThat(tokens.verify("a.b.c")).isEmpty();
        assertThat(tokens.verify("!!!.???")).isEmpty();
    }

    @Test
    void unknownScopeIsRejectedEvenWithValidSignature() {
        // Chữ ký đúng khoá nhưng payload sai định dạng → vẫn phải bị từ chối
        assertThat(tokens.verify(signRaw("u1|42|CAT:WEATHER"))).isEmpty();
        assertThat(tokens.verify(signRaw("u1|42|TRIP:abc"))).isEmpty();
        assertThat(tokens.verify(signRaw("u2|42|ALL"))).isEmpty();
        assertThat(tokens.verify(signRaw("u1|-1|ALL"))).isEmpty();
    }

    private String signRaw(String payload) {
        return tokens.signPayload(payload);
    }

    /** Đổi ký tự đầu (ký tự cuối base64 có bit đệm, đổi có thể không làm đổi byte). */
    private static String flipFirst(String value) {
        return (value.charAt(0) == 'A' ? 'B' : 'A') + value.substring(1);
    }
}
