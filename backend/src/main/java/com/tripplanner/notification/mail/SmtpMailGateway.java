package com.tripplanner.notification.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

/** Gửi qua SMTP (Gmail App Password, hoặc Mailpit khi chạy local). Email gồm cả bản HTML và bản text. */
public class SmtpMailGateway implements MailGateway {

    private final JavaMailSender sender;
    private final String fromAddress;
    private final String fromName;

    public SmtpMailGateway(JavaMailSender sender, String fromAddress, String fromName) {
        this.sender = sender;
        this.fromAddress = fromAddress;
        this.fromName = fromName;
    }

    @Override
    public boolean isConfigured() {
        return true;
    }

    @Override
    public void send(OutgoingEmail email) {
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress, fromName);
            helper.setTo(email.to());
            helper.setSubject(email.subject());
            helper.setText(email.text(), email.html());
            for (Map.Entry<String, String> header : email.headers().entrySet()) {
                message.setHeader(header.getKey(), header.getValue());
            }
            sender.send(message);
        } catch (MessagingException | UnsupportedEncodingException | MailException e) {
            throw new MailDeliveryException("Gửi email thất bại: " + e.getMessage(), e);
        }
    }
}
