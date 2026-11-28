package com.tripplanner.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripplanner.auth.GoogleTokenVerifier;
import com.tripplanner.weather.WeatherProvider;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Test tích hợp chạy trên MySQL local (schema riêng, xem application-test.yml).
 * Chỉ chạy khi có biến môi trường TEST_DB_URL, nếu không sẽ tự bỏ qua.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@RequiresTestDatabase
public abstract class IntegrationTest {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected JdbcTemplate jdbc;

    @MockitoBean
    protected GoogleTokenVerifier googleTokenVerifier;

    /** Không gọi Open-Meteo thật trong test (docs/sdd-weather.md). */
    @MockitoBean
    protected WeatherProvider weatherProvider;

    @BeforeEach
    void cleanDatabase() {
        jdbc.update("DELETE FROM trip_proposals");  // proposal_votes CASCADE
        jdbc.update("DELETE FROM album_photos");   // album_photo_days CASCADE
        jdbc.update("DELETE FROM trip_rooms");     // room_assignments CASCADE
        jdbc.update("DELETE FROM settlements");
        jdbc.update("DELETE FROM expenses");   // expense_shares CASCADE
        jdbc.update("DELETE FROM polls");      // poll_options, poll_votes CASCADE
        jdbc.update("DELETE FROM media_files");
        jdbc.update("DELETE FROM trip_checklists");
        jdbc.update("DELETE FROM itinerary_items");
        jdbc.update("DELETE FROM trip_day_dress_colors");
        jdbc.update("DELETE FROM member_availabilities");
        jdbc.update("DELETE FROM trip_days");
        jdbc.update("DELETE FROM packing_items");
        jdbc.update("DELETE FROM trip_members");
        jdbc.update("DELETE FROM trips");
        jdbc.update("DELETE FROM users");
    }

    protected String json(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    protected JsonNode read(String content) throws Exception {
        return objectMapper.readTree(content);
    }

    protected MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder request, String token) {
        return request.header("Authorization", "Bearer " + token);
    }

    /** Đăng ký user mới, trả về access token. */
    protected String register(String username, String displayName) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", username, "password", "matkhau123",
                                "displayName", displayName))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return read(body).get("accessToken").asText();
    }

    protected long userId(String token) throws Exception {
        String body = mvc.perform(auth(get("/api/v1/users/me"), token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return read(body).get("id").asLong();
    }
}
