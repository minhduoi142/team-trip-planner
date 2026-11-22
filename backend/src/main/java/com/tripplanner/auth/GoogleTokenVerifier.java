package com.tripplanner.auth;

/** Xác minh Google ID token do Google Identity Services cấp cho FE. */
public interface GoogleTokenVerifier {

    /**
     * @throws com.tripplanner.common.BusinessException INVALID_GOOGLE_TOKEN nếu token sai/hết hạn,
     *     GOOGLE_LOGIN_NOT_CONFIGURED nếu chưa đặt GOOGLE_CLIENT_ID
     */
    GoogleProfile verify(String idToken);

    record GoogleProfile(String subject, String email, String name, String pictureUrl) {
    }
}
