package com.tripplanner.notification.mail;

/** Gửi mail thất bại (SMTP lỗi, timeout…). Dispatcher coi là lỗi tạm thời và thử lại. */
public class MailDeliveryException extends RuntimeException {

    public MailDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}
