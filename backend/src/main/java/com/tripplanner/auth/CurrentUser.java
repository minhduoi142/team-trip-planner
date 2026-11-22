package com.tripplanner.auth;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import org.springframework.security.oauth2.jwt.Jwt;

/** Lấy userId (claim {@code sub}) từ JWT của hệ thống. */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static Long id(Jwt jwt) {
        if (jwt == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        try {
            return Long.valueOf(jwt.getSubject());
        } catch (NumberFormatException e) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
    }
}
