package com.tripplanner.notification.mail;

import com.tripplanner.config.AppProperties;
import com.tripplanner.notification.UnsubscribeTokens;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.util.StringUtils;

@Slf4j
@Configuration
public class MailConfig {

    /**
     * SMTP khi đã đặt MAIL_HOST, ngược lại tắt gửi mail. Tự kiểm tra host (không dựa vào auto-config của
     * JavaMailSender, vì auto-config vẫn bật khi {@code spring.mail.host} là chuỗi rỗng).
     */
    @Bean
    public MailGateway mailGateway(ObjectProvider<JavaMailSender> sender, AppProperties properties,
                                   @Value("${spring.mail.host:}") String host,
                                   @Value("${spring.mail.username:}") String username) {
        JavaMailSender javaMailSender = sender.getIfAvailable();
        if (!StringUtils.hasText(host) || javaMailSender == null) {
            log.info("Chưa cấu hình MAIL_HOST: tắt gửi email thông báo");
            return new DisabledMailGateway();
        }
        AppProperties.Mail mail = properties.mail();
        String from = mail != null && StringUtils.hasText(mail.from()) ? mail.from()
                : StringUtils.hasText(username) ? username : "no-reply@localhost";
        String fromName = mail != null && StringUtils.hasText(mail.fromName()) ? mail.fromName() : "Trip Planner";
        log.info("Gửi email qua SMTP {} (from {})", host, from);
        return new SmtpMailGateway(javaMailSender, from, fromName);
    }

    @Bean
    public UnsubscribeTokens unsubscribeTokens(AppProperties properties) {
        return new UnsubscribeTokens(properties.jwt().secret());
    }
}
