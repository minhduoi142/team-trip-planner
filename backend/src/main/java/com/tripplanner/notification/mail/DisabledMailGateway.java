package com.tripplanner.notification.mail;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;

/** Dùng khi chưa đặt MAIL_HOST: mọi lần gửi đều báo "chưa cấu hình". */
public class DisabledMailGateway implements MailGateway {

    @Override
    public boolean isConfigured() {
        return false;
    }

    @Override
    public void send(OutgoingEmail email) {
        throw new BusinessException(ErrorCode.MAIL_NOT_CONFIGURED);
    }
}
