package com.tripplanner.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.auth.GoogleTokenVerifier.GoogleProfile;
import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.support.IntegrationTest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class AuthIntegrationTest extends IntegrationTest {

    @Test
    void registerThenLoginWithCaseInsensitiveUsername() throws Exception {
        String token = register("Linh.Ng", "Linh");
        assertThat(token).isNotBlank();

        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "LINH.NG", "password", "matkhau123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.username").value("linh.ng"))
                .andExpect(jsonPath("$.user.hasPassword").value(true))
                .andExpect(jsonPath("$.user.hasGoogle").value(false));
    }

    @Test
    void duplicateUsernameIsRejected() throws Exception {
        register("linh", "Linh");
        mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "LINH", "password", "matkhau123", "displayName", "Khác"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("USERNAME_TAKEN"));
    }

    @Test
    void wrongPasswordAndUnknownUserGiveSameError() throws Exception {
        register("linh", "Linh");
        for (String username : new String[] {"linh", "khong-ton-tai"}) {
            mvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("username", username, "password", "sai-mat-khau"))))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.detail").value("Sai tên đăng nhập hoặc mật khẩu"));
        }
    }

    @Test
    void validationErrorsAreReturnedAsProblemDetail() throws Exception {
        mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "a b", "password", "123", "displayName", ""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.username").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists())
                .andExpect(jsonPath("$.fieldErrors.displayName").exists());
    }

    @Test
    void protectedEndpointsRequireToken() throws Exception {
        mvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void updateProfile() throws Exception {
        String token = register("linh", "Linh");
        mvc.perform(auth(patch("/api/v1/users/me"), token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("displayName", "Linh Xinh", "avatarUrl", "https://img.example/a.png"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Linh Xinh"))
                .andExpect(jsonPath("$.avatarUrl").value("https://img.example/a.png"));
    }

    @Test
    void googleLoginCreatesUserOnceAndReusesIt() throws Exception {
        given(googleTokenVerifier.verify(eq("google-token")))
                .willReturn(new GoogleProfile("sub-123", "Mai@Gmail.com", "Mai Trần", "https://pic/mai.png"));

        JsonNode first = googleLogin("google-token");
        JsonNode second = googleLogin("google-token");

        assertThat(first.at("/user/id").asLong()).isEqualTo(second.at("/user/id").asLong());
        assertThat(first.at("/user/displayName").asText()).isEqualTo("Mai Trần");
        assertThat(first.at("/user/email").asText()).isEqualTo("mai@gmail.com");
        assertThat(first.at("/user/hasGoogle").asBoolean()).isTrue();
        assertThat(first.at("/user/hasPassword").asBoolean()).isFalse();
    }

    @Test
    void googleLoginLinksToExistingAccountWithSameEmail() throws Exception {
        given(googleTokenVerifier.verify(eq("t1")))
                .willReturn(new GoogleProfile("sub-1", "lan@gmail.com", "Lan", null));
        given(googleTokenVerifier.verify(eq("t2")))
                .willReturn(new GoogleProfile("sub-2", "lan@gmail.com", "Lan", null));

        long firstId = googleLogin("t1").at("/user/id").asLong();
        // Cùng email, khác sub (hiếm, nhưng phải gom về một tài khoản thay vì lỗi UNIQUE)
        long secondId = googleLogin("t2").at("/user/id").asLong();
        assertThat(secondId).isEqualTo(firstId);
    }

    @Test
    void invalidGoogleTokenIsRejected() throws Exception {
        given(googleTokenVerifier.verify(anyString()))
                .willThrow(new BusinessException(ErrorCode.INVALID_GOOGLE_TOKEN));
        mvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("idToken", "bad"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_GOOGLE_TOKEN"));
    }

    private JsonNode googleLogin(String idToken) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("idToken", idToken))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return read(body);
    }
}
