package com.tripplanner.notification.mail;

/**
 * Cổng gửi email. Bản thật là {@link SmtpMailGateway}; chưa đặt MAIL_HOST thì là {@link DisabledMailGateway}.
 * Test mock interface này (như StorageService).
 */
public interface MailGateway {

    /** Máy chủ đã cấu hình gửi mail chưa. */
    boolean isConfigured();

    /**
     * @throws com.tripplanner.common.BusinessException MAIL_NOT_CONFIGURED khi chưa cấu hình
     * @throws MailDeliveryException khi gửi lỗi
     */
    void send(OutgoingEmail email);
}
