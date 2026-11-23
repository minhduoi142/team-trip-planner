package com.tripplanner.auth.refresh;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.support.IntegrationTest;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MvcResult;

class RefreshTokenIntegrationTest extends IntegrationTest {

    @Test
    void loginSetsSecureHttpOnlyCookieScopedToAuth() throws Exception {
        MvcResult result = registerRaw("linh");
        String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie)
                .startsWith("tp_rt=")
                .contains("Path=/api/v1/auth", "HttpOnly", "Secure", "SameSite=Strict", "Max-Age=");
        assertThat(read(result.getResponse().getContentAsString()).get("accessToken").asText()).isNotBlank();
    }

    @Test
    void rotationIssuesNewTokensAndOldTokenCannotBeReused() throws Exception {
        String rt1 = cookieValue(registerRaw("linh").getResponse());

        MockHttpServletResponse first = refresh(rt1, 200);
        String rt2 = cookieValue(first);
        String access = read(first.getContentAsString()).get("accessToken").asText();
        assertThat(rt2).isNotBlank().isNotEqualTo(rt1);
        // Access token mới gọi API được
        mvc.perform(auth(get("/api/v1/users/me"), access)).andExpect(status().isOk());

        // Dùng lại rt1 ngay (2 tab cùng làm mới) → STALE, KHÔNG xóa cookie, họ vẫn sống
        MockHttpServletResponse stale = refresh(rt1, 401);
        assertThat(code(stale)).isEqualTo("REFRESH_TOKEN_STALE");
        assertThat(stale.getHeader(HttpHeaders.SET_COOKIE)).isNull();
        String rt3 = cookieValue(refresh(rt2, 200));

        // Giả lập rt1 đã được dùng từ 1 phút trước (ngoài grace window) rồi bị dùng lại → REUSED, thu hồi cả họ
        jdbc.update("UPDATE refresh_tokens SET consumed_at = consumed_at - INTERVAL 1 MINUTE WHERE token_hash = ?",
                RefreshTokenService.hash(rt1));
        MockHttpServletResponse reused = refresh(rt1, 401);
        assertThat(code(reused)).isEqualTo("REFRESH_TOKEN_REUSED");
        assertThat(reused.getHeader(HttpHeaders.SET_COOKIE)).contains("Max-Age=0");
        assertThat(jdbc.queryForObject("SELECT revoke_reason FROM refresh_token_families", String.class))
                .isEqualTo("REUSE_DETECTED");

        // Token mới nhất của họ (đang ở tay người dùng thật hoặc kẻ gian) cũng bị chặn
        assertThat(code(refresh(rt3, 401))).isEqualTo("INVALID_REFRESH_TOKEN");
    }

    @Test
    void missingOrUnknownCookieIsInvalid() throws Exception {
        mvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
        assertThat(code(refresh("khong-ton-tai", 401))).isEqualTo("INVALID_REFRESH_TOKEN");
    }

    @Test
    void logoutRevokesFamilyAndClearsCookie() throws Exception {
        String rt = cookieValue(registerRaw("linh").getResponse());
        MockHttpServletResponse out = mvc.perform(post("/api/v1/auth/logout").cookie(new Cookie("tp_rt", rt)))
                .andExpect(status().isNoContent()).andReturn().getResponse();
        assertThat(out.getHeader(HttpHeaders.SET_COOKIE)).contains("tp_rt=", "Max-Age=0");
        assertThat(code(refresh(rt, 401))).isEqualTo("INVALID_REFRESH_TOKEN");
        // Idempotent: không có cookie vẫn 204
        mvc.perform(post("/api/v1/auth/logout")).andExpect(status().isNoContent());
    }

    @Test
    void logoutAllRevokesEveryFamilyOfUser() throws Exception {
        MvcResult registered = registerRaw("linh");
        String rtPhone = cookieValue(registered.getResponse());
        MockHttpServletResponse laptop = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "linh", "password", "matkhau123"))))
                .andExpect(status().isOk()).andReturn().getResponse();
        String rtLaptop = cookieValue(laptop);
        String access = read(laptop.getContentAsString()).get("accessToken").asText();

        mvc.perform(auth(post("/api/v1/auth/logout-all"), access)).andExpect(status().isNoContent());
        for (String rt : List.of(rtPhone, rtLaptop)) {
            assertThat(code(refresh(rt, 401))).isEqualTo("INVALID_REFRESH_TOKEN");
        }
        // logout-all cần access token
        mvc.perform(post("/api/v1/auth/logout-all")).andExpect(status().isUnauthorized());
    }

    // ---------------------------------------------------------------- helpers

    private MvcResult registerRaw(String username) throws Exception {
        return mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", username, "password", "matkhau123", "displayName", "Linh"))))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private MockHttpServletResponse refresh(String rt, int expected) throws Exception {
        return mvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie("tp_rt", rt)))
                .andExpect(status().is(expected))
                .andReturn().getResponse();
    }

    /** Giá trị cookie tp_rt trong header Set-Cookie. */
    private static String cookieValue(MockHttpServletResponse response) {
        String header = response.getHeader(HttpHeaders.SET_COOKIE);
        assertThat(header).as("Set-Cookie").isNotNull().startsWith("tp_rt=");
        return header.substring("tp_rt=".length(), header.indexOf(';'));
    }

    private String code(MockHttpServletResponse response) throws Exception {
        JsonNode body = read(response.getContentAsString());
        return body.get("code").asText();
    }
}
