package com.tripplanner.notification.mail;

import java.util.Map;

/** Một email đã render xong. {@code headers}: vd List-Unsubscribe (có thể rỗng). */
public record OutgoingEmail(String to, String subject, String html, String text, Map<String, String> headers) {

    public OutgoingEmail {
        headers = headers == null ? Map.of() : Map.copyOf(headers);
    }
}
