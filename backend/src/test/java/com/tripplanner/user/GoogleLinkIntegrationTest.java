package com.tripplanner.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.auth.GoogleTokenVerifier.GoogleProfile;
import com.tripplanner.support.IntegrationTest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class GoogleLinkIntegrationTest extends IntegrationTest {

    @Test
    void passwordAccountLinksGoogleThenGoogleLoginReturnsSameAccount() throws Exception {
        given(googleTokenVerifier.verify(eq("t-linh")))
                .willReturn(new GoogleProfile("sub-linh", "Linh@Gmail.com", "Linh G", "https://pic/linh.png"));
        String token = register("linh", "Linh");
        long linhId = userId(token);

        JsonNode linked = link(token, "t-linh", 200);
        assertThat(linked.get("hasGoogle").asBoolean()).isTrue();
        assertThat(linked.get("hasPassword").asBoolean()).isTrue();
        assertThat(linked.get("email").asText()).isEqualTo("linh@gmail.com");
        assertThat(linked.get("avatarUrl").asText()).isEqualTo("https://pic/linh.png");
        assertThat(linked.get("displayName").asText()).isEqualTo("Linh");   // không ghi đè tên

        // Gắn lại đúng Google đó: idempotent
        link(token, "t-linh", 200);

        // "Tiếp tục với Google" → vào đúng tài khoản linh, không tạo tài khoản mới
        assertThat(googleLogin("t-linh").at("/user/id").asLong()).isEqualTo(linhId);
    }

    @Test
    void cannotLinkGoogleAlreadyUsedByAnotherAccountOrASecondGoogle() throws Exception {
        given(googleTokenVerifier.verify(eq("t-mai")))
                .willReturn(new GoogleProfile("sub-mai", "mai@gmail.com", "Mai", null));
        given(googleTokenVerifier.verify(eq("t-other")))
                .willReturn(new GoogleProfile("sub-other", "other@gmail.com", "Other", null));
        googleLogin("t-mai");   // Google của Mai đã tự tạo 1 tài khoản riêng

        String lan = register("lan", "Lan");
        mvc.perform(auth(put("/api/v1/users/me/google"), lan)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("idToken", "t-mai"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("GOOGLE_ALREADY_LINKED"));

        link(lan, "t-other", 200);
        // Đã có Google khác → phải hủy trước
        given(googleTokenVerifier.verify(eq("t-third")))
                .willReturn(new GoogleProfile("sub-third", "third@gmail.com", "Third", null));
        link(lan, "t-third", 409);
    }

    @Test
    void unlinkRequiresPasswordAndClearsEmail() throws Exception {
        given(googleTokenVerifier.verify(eq("t-ngoc")))
                .willReturn(new GoogleProfile("sub-ngoc", "ngoc@gmail.com", "Ngọc", null));
        String ngoc = register("ngoc", "Ngọc");
        long ngocId = userId(ngoc);
        link(ngoc, "t-ngoc", 200);

        JsonNode unlinked = read(mvc.perform(auth(delete("/api/v1/users/me/google"), ngoc))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(unlinked.get("hasGoogle").asBoolean()).isFalse();
        assertThat(unlinked.get("email").isNull()).isTrue();
        // Đã gỡ hẳn: đăng nhập Google lần sau tạo tài khoản mới, không tự liên kết lại theo email
        assertThat(googleLogin("t-ngoc").at("/user/id").asLong()).isNotEqualTo(ngocId);

        // Tài khoản chỉ có Google → không gỡ được
        given(googleTokenVerifier.verify(eq("t-vy")))
                .willReturn(new GoogleProfile("sub-vy", "vy@gmail.com", "Vy", null));
        String vy = googleLogin("t-vy").get("accessToken").asText();
        mvc.perform(auth(delete("/api/v1/users/me/google"), vy))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("GOOGLE_UNLINK_NOT_ALLOWED"));
    }

    private JsonNode link(String token, String idToken, int expected) throws Exception {
        String body = mvc.perform(auth(put("/api/v1/users/me/google"), token)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("idToken", idToken))))
                .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        return read(body);
    }

    private JsonNode googleLogin(String idToken) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("idToken", idToken))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return read(body);
    }
}
