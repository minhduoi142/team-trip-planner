package com.tripplanner.weather;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.support.IntegrationTest;
import com.tripplanner.weather.model.DailyForecast;
import com.tripplanner.weather.model.GeoPlace;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class WeatherIntegrationTest extends IntegrationTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    @Autowired
    private WeatherService weatherService;

    private String ownerToken;

    @BeforeEach
    void setUp() throws Exception {
        weatherService.clearCaches();
        ownerToken = register("linh", "Linh");
    }

    /** 16 ngày dự báo bắt đầu từ hôm nay. */
    private static List<DailyForecast> sixteenDays() {
        List<DailyForecast> days = new ArrayList<>();
        for (int i = 0; i < 16; i++) {
            days.add(new DailyForecast(TODAY.plusDays(i), 80, 15.5, 24.0, 70, 6.2, 12.0, null));
        }
        return days;
    }

    private long createTrip(LocalDate from, LocalDate to, String lat, String lon) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Đà Lạt săn mây");
        body.put("destination", "Đà Lạt, Lam Dong, Việt Nam");
        body.put("plannedStartDate", from.toString());
        body.put("plannedEndDate", to.toString());
        body.put("destinationLat", lat == null ? null : new BigDecimal(lat));
        body.put("destinationLon", lon == null ? null : new BigDecimal(lon));
        String response = mvc.perform(auth(post("/api/v1/trips"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return read(response).get("id").asLong();
    }

    private void lock(long tripId, LocalDate from, LocalDate to) throws Exception {
        mvc.perform(auth(patch("/api/v1/trips/" + tripId + "/lock-date"), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("startDate", from.toString(), "endDate", to.toString()))))
                .andExpect(status().isOk());
    }

    private JsonNode weather(long tripId, String token) throws Exception {
        return read(mvc.perform(auth(get("/api/v1/trips/" + tripId + "/weather"), token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
    }

    @Test
    void unlockedTripHasNoDatesAndNeverCallsProvider() throws Exception {
        long tripId = createTrip(TODAY.plusDays(2), TODAY.plusDays(5), "11.94646", "108.44193");

        JsonNode body = weather(tripId, ownerToken);

        assertThat(body.get("source").asText()).isEqualTo("Open-Meteo.com");
        assertThat(body.get("days")).isEmpty();
        assertThat(body.get("fetchedAt").isNull()).isTrue();
        verify(weatherProvider, never()).forecast(any());
    }

    @Test
    void lockedTripWithoutLocationIsNoLocation() throws Exception {
        long tripId = createTrip(TODAY.plusDays(2), TODAY.plusDays(4), null, null);
        lock(tripId, TODAY.plusDays(2), TODAY.plusDays(4));

        JsonNode days = weather(tripId, ownerToken).get("days");

        assertThat(days).hasSize(3);
        days.forEach(d -> assertThat(d.get("status").asText()).isEqualTo("NO_LOCATION"));
        assertThat(days.get(0).get("placeName").isNull()).isTrue();
        verify(weatherProvider, never()).forecast(any());
    }

    @Test
    void forecastAndTooFarDaysUseOneCachedCall() throws Exception {
        when(weatherProvider.forecast(any())).thenReturn(sixteenDays());
        long tripId = createTrip(TODAY.plusDays(13), TODAY.plusDays(17), "11.94646", "108.44193");
        lock(tripId, TODAY.plusDays(13), TODAY.plusDays(17));
        // Ngày thừa (ngoài số ngày đã chốt) → không có ngày thật
        jdbc.update("INSERT INTO trip_days (trip_id, day_index) VALUES (?, 9)", tripId);

        JsonNode body = weather(tripId, ownerToken);
        JsonNode days = body.get("days");

        assertThat(days).hasSize(6);
        JsonNode day1 = days.get(0);
        assertThat(day1.get("dayIndex").asInt()).isEqualTo(1);
        assertThat(day1.get("date").asText()).isEqualTo(TODAY.plusDays(13).toString());
        assertThat(day1.get("status").asText()).isEqualTo("FORECAST");
        assertThat(day1.get("placeName").asText()).isEqualTo("Đà Lạt, Lam Dong, Việt Nam");
        assertThat(day1.at("/forecast/condition").asText()).isEqualTo("RAIN");
        assertThat(day1.at("/forecast/label").asText()).isEqualTo("Mưa rào nhẹ");
        assertThat(day1.at("/forecast/precipProbability").asInt()).isEqualTo(70);
        assertThat(day1.at("/forecast/uvMax").isNull()).isTrue();
        assertThat(days.get(2).get("status").asText()).isEqualTo("FORECAST");   // hôm nay + 15
        assertThat(days.get(3).get("status").asText()).isEqualTo("TOO_FAR");    // hôm nay + 16
        assertThat(days.get(3).get("availableFrom").asText()).isEqualTo(TODAY.plusDays(1).toString());
        assertThat(days.get(5).get("status").asText()).isEqualTo("NO_DATE");
        assertThat(body.get("fetchedAt").isNull()).isFalse();

        weather(tripId, ownerToken);   // lần 2: dùng cache

        ArgumentCaptor<Coordinates> point = ArgumentCaptor.forClass(Coordinates.class);
        verify(weatherProvider, times(1)).forecast(point.capture());
        assertThat(point.getValue().cacheKey()).isEqualTo("11.95,108.44");
        assertThat(point.getValue().lat()).isEqualByComparingTo("11.95");   // gọi bằng tọa độ đã làm tròn
    }

    @Test
    void tripEntirelyBeyondHorizonDoesNotCallProvider() throws Exception {
        long tripId = createTrip(TODAY.plusDays(30), TODAY.plusDays(32), "11.94646", "108.44193");
        lock(tripId, TODAY.plusDays(30), TODAY.plusDays(32));

        JsonNode days = weather(tripId, ownerToken).get("days");

        days.forEach(d -> assertThat(d.get("status").asText()).isEqualTo("TOO_FAR"));
        verify(weatherProvider, never()).forecast(any());
    }

    @Test
    void providerFailureStillReturns200WithUnavailable() throws Exception {
        when(weatherProvider.forecast(any())).thenThrow(new WeatherUnavailableException("timeout"));
        long tripId = createTrip(TODAY.plusDays(1), TODAY.plusDays(2), "10.77", "106.70");
        lock(tripId, TODAY.plusDays(1), TODAY.plusDays(2));

        JsonNode body = weather(tripId, ownerToken);

        body.get("days").forEach(d -> assertThat(d.get("status").asText()).isEqualTo("UNAVAILABLE"));
        assertThat(body.get("fetchedAt").isNull()).isTrue();
    }

    @Test
    void sunTimesExistForEveryDatedDayEvenBeyondForecastRange() throws Exception {
        // Mock múi giờ trả null = lỗi → tọa độ trong Việt Nam dùng Asia/Ho_Chi_Minh
        long tripId = createTrip(TODAY.plusDays(30), TODAY.plusDays(31), "11.94646", "108.44193");
        lock(tripId, TODAY.plusDays(30), TODAY.plusDays(31));
        jdbc.update("INSERT INTO trip_days (trip_id, day_index) VALUES (?, 9)", tripId);   // ngày thừa

        JsonNode days = weather(tripId, ownerToken).get("days");

        JsonNode sun = days.get(0).get("sun");
        assertThat(days.get(0).get("status").asText()).isEqualTo("TOO_FAR");
        assertThat(sun.get("timezone").asText()).isEqualTo("Asia/Ho_Chi_Minh");
        assertThat(sun.get("sunrise").asText()).matches("0[5-6]:[0-5][0-9]");
        assertThat(sun.get("sunset").asText()).matches("1[7-8]:[0-5][0-9]");
        assertThat(sun.get("eveningGoldenStart").asText()).isLessThan(sun.get("sunset").asText());
        assertThat(days.get(2).get("status").asText()).isEqualTo("NO_DATE");
        assertThat(days.get(2).get("sun").isNull()).isTrue();
        verify(weatherProvider, never()).forecast(any());
    }

    @Test
    void sunTimesFollowTheDayOwnPlaceAndItsTimezone() throws Exception {
        when(weatherProvider.timezone(any())).thenAnswer(inv -> {
            Coordinates c = inv.getArgument(0);
            return c.lat().doubleValue() > 30 ? ZoneId.of("Asia/Tokyo") : ZoneId.of("Asia/Ho_Chi_Minh");
        });
        long tripId = createTrip(TODAY.plusDays(40), TODAY.plusDays(41), "11.94646", "108.44193");
        lock(tripId, TODAY.plusDays(40), TODAY.plusDays(41));
        jdbc.update("""
                UPDATE trip_days SET place_name = 'Tokyo', place_lat = 35.68, place_lon = 139.69
                WHERE trip_id = ? AND day_index = 2""", tripId);

        JsonNode days = weather(tripId, ownerToken).get("days");

        assertThat(days.get(0).at("/sun/timezone").asText()).isEqualTo("Asia/Ho_Chi_Minh");
        assertThat(days.get(1).at("/sun/timezone").asText()).isEqualTo("Asia/Tokyo");
        assertThat(days.get(1).get("placeName").asText()).isEqualTo("Tokyo");
    }

    @Test
    void pastDaysAndForeignPlacesWithoutTimezoneHaveNoSun() throws Exception {
        // Múi giờ lỗi + tọa độ ngoài Việt Nam → không đoán bừa
        long tripId = createTrip(TODAY.plusDays(20), TODAY.plusDays(21), "35.68", "139.69");
        lock(tripId, TODAY.plusDays(20), TODAY.plusDays(21));
        weather(tripId, ownerToken).get("days").forEach(d -> assertThat(d.get("sun").isNull()).isTrue());

        long past = createTrip(TODAY.plusDays(5), TODAY.plusDays(6), "11.94646", "108.44193");
        lock(past, TODAY.plusDays(5), TODAY.plusDays(6));
        jdbc.update("UPDATE trips SET start_date = ?, end_date = ? WHERE id = ?",
                TODAY.minusDays(5), TODAY.minusDays(4), past);
        JsonNode days = weather(past, ownerToken).get("days");
        assertThat(days.get(0).get("status").asText()).isEqualTo("PAST");
        assertThat(days.get(0).get("sun").isNull()).isTrue();
    }

    @Test
    void nonMemberIsForbidden() throws Exception {
        long tripId = createTrip(TODAY.plusDays(1), TODAY.plusDays(2), "10.77", "106.70");
        String stranger = register("mai", "Mai");
        mvc.perform(auth(get("/api/v1/trips/" + tripId + "/weather"), stranger))
                .andExpect(status().isForbidden());
    }

    @Test
    void tripCoordinatesAreSavedValidatedAndCleared() throws Exception {
        long tripId = createTrip(TODAY.plusDays(1), TODAY.plusDays(2), "11.946463", "108.44193");
        mvc.perform(auth(get("/api/v1/trips/" + tripId), ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.destinationLat").value(11.94646))
                .andExpect(jsonPath("$.destinationLon").value(108.44193));

        Map<String, Object> onlyLat = new HashMap<>();
        onlyLat.put("title", "Đà Lạt");
        onlyLat.put("destinationLat", 11.9);
        mvc.perform(auth(patch("/api/v1/trips/" + tripId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(onlyLat)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_LOCATION"));

        Map<String, Object> outOfRange = new HashMap<>(onlyLat);
        outOfRange.put("destinationLon", 200);
        mvc.perform(auth(patch("/api/v1/trips/" + tripId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(outOfRange)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_LOCATION"));

        // Gõ tay điểm đến (không chọn gợi ý) → FE gửi tọa độ null = xóa vị trí
        mvc.perform(auth(patch("/api/v1/trips/" + tripId), ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Đà Lạt", "destination", "Đà Lạt"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.destination").value("Đà Lạt"))
                .andExpect(jsonPath("$.destinationLat").isEmpty())
                .andExpect(jsonPath("$.destinationLon").isEmpty());
    }

    // ---------------------------------------------------------------- W2: vị trí riêng từng ngày + gợi ý

    private JsonNode itinerary(long tripId) throws Exception {
        return read(mvc.perform(auth(get("/api/v1/trips/" + tripId + "/itinerary"), ownerToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
    }

    private Map<String, Object> dayBody(String placeName, String lat, String lon) {
        Map<String, Object> body = new HashMap<>();
        body.put("note", null);
        body.put("dressTheme", "Biển xanh");
        body.put("dressNote", null);
        body.put("dressImageUrl", null);
        body.put("dressColors", List.of());
        body.put("placeName", placeName);
        body.put("placeLat", lat == null ? null : new BigDecimal(lat));
        body.put("placeLon", lon == null ? null : new BigDecimal(lon));
        return body;
    }

    private ResultActions putDay(long dayId, Map<String, Object> body)
            throws Exception {
        return mvc.perform(auth(put("/api/v1/trip-days/" + dayId), ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(body)));
    }

    @Test
    void dayPlaceOverridesTripLocationAndEachPlaceIsFetchedOnce() throws Exception {
        when(weatherProvider.forecast(any())).thenReturn(sixteenDays());
        long tripId = createTrip(TODAY.plusDays(2), TODAY.plusDays(4), "11.94646", "108.44193");   // Đà Lạt
        lock(tripId, TODAY.plusDays(2), TODAY.plusDays(4));
        long day3 = itinerary(tripId).at("/days/2/id").asLong();

        putDay(day3, dayBody("Nha Trang, Khánh Hòa, Việt Nam", "12.24507", "109.19432"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days[2].place.name").value("Nha Trang, Khánh Hòa, Việt Nam"))
                .andExpect(jsonPath("$.days[2].place.lat").value(12.24507))
                .andExpect(jsonPath("$.days[0].place").isEmpty());

        JsonNode days = weather(tripId, ownerToken).get("days");

        assertThat(days.get(0).get("placeName").asText()).isEqualTo("Đà Lạt, Lam Dong, Việt Nam");
        assertThat(days.get(2).get("placeName").asText()).isEqualTo("Nha Trang, Khánh Hòa, Việt Nam");
        assertThat(days.get(2).get("status").asText()).isEqualTo("FORECAST");
        ArgumentCaptor<Coordinates> points = ArgumentCaptor.forClass(Coordinates.class);
        verify(weatherProvider, times(2)).forecast(points.capture());   // 2 vị trí, mỗi vị trí 1 lần
        assertThat(points.getAllValues()).extracting(Coordinates::cacheKey)
                .containsExactlyInAnyOrder("11.95,108.44", "12.25,109.19");
    }

    @Test
    void dayPlaceWithoutTripLocationStillHasWeather() throws Exception {
        when(weatherProvider.forecast(any())).thenReturn(sixteenDays());
        long tripId = createTrip(TODAY.plusDays(1), TODAY.plusDays(2), null, null);
        lock(tripId, TODAY.plusDays(1), TODAY.plusDays(2));
        long day1 = itinerary(tripId).at("/days/0/id").asLong();
        putDay(day1, dayBody("Sa Pa, Lào Cai, Việt Nam", "22.33", "103.84")).andExpect(status().isOk());

        JsonNode days = weather(tripId, ownerToken).get("days");

        assertThat(days.get(0).get("status").asText()).isEqualTo("FORECAST");
        assertThat(days.get(1).get("status").asText()).isEqualTo("NO_LOCATION");
    }

    @Test
    void partialDayPlaceIsRejectedAndNullClearsIt() throws Exception {
        long tripId = createTrip(TODAY.plusDays(1), TODAY.plusDays(2), null, null);
        lock(tripId, TODAY.plusDays(1), TODAY.plusDays(2));
        long day1 = itinerary(tripId).at("/days/0/id").asLong();

        putDay(day1, dayBody("Gõ tay không chọn gợi ý", null, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_LOCATION"));
        putDay(day1, dayBody(null, "12.2", "109.1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_LOCATION"));
        putDay(day1, dayBody("Nha Trang", "12.2", null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_LOCATION"));

        putDay(day1, dayBody("Nha Trang", "12.2", "109.1")).andExpect(status().isOk());
        putDay(day1, dayBody("  ", null, null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].place").isEmpty());
    }

    @Test
    void dayPlaceFollowsTheDayAcrossUnlockAndRelock() throws Exception {
        long tripId = createTrip(TODAY.plusDays(1), TODAY.plusDays(5), null, null);
        lock(tripId, TODAY.plusDays(1), TODAY.plusDays(3));
        long day2 = itinerary(tripId).at("/days/1/id").asLong();
        putDay(day2, dayBody("Nha Trang", "12.2", "109.1")).andExpect(status().isOk());

        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/lock-date"), ownerToken))
                .andExpect(status().isOk());
        lock(tripId, TODAY.plusDays(2), TODAY.plusDays(4));

        JsonNode relocked = itinerary(tripId);
        assertThat(relocked.at("/days/1/id").asLong()).isEqualTo(day2);
        assertThat(relocked.at("/days/1/place/name").asText()).isEqualTo("Nha Trang");
        // Rút ngắn còn 1 ngày: ngày 2 có vị trí riêng = có nội dung → thành ngày thừa, không bị xóa
        mvc.perform(auth(delete("/api/v1/trips/" + tripId + "/lock-date"), ownerToken))
                .andExpect(status().isOk());
        lock(tripId, TODAY.plusDays(2), TODAY.plusDays(2));
        assertThat(itinerary(tripId).at("/days/1/overflow").asBoolean()).isTrue();
    }

    @Test
    void forecastCarriesAdviceWithChecklistSuggestion() throws Exception {
        when(weatherProvider.forecast(any())).thenReturn(sixteenDays());   // mưa 70%, thấp nhất 15.5°C
        long tripId = createTrip(TODAY.plusDays(1), TODAY.plusDays(1), "10.77", "106.70");
        lock(tripId, TODAY.plusDays(1), TODAY.plusDays(1));

        JsonNode advice = weather(tripId, ownerToken).at("/days/0/forecast/advice");

        assertThat(advice).hasSize(1);
        assertThat(advice.get(0).get("type").asText()).isEqualTo("RAIN");
        assertThat(advice.get(0).get("text").asText()).isEqualTo("Khả năng mưa 70% – nhớ mang áo mưa/ô");
        assertThat(advice.get(0).at("/checklistItem/itemName").asText()).isEqualTo("Áo mưa");
        assertThat(advice.get(0).at("/checklistItem/category").asText()).isEqualTo("OTHER");
    }

    @Test
    void geoSearchMapsLabelsAndCachesQueries() throws Exception {
        when(weatherProvider.search(anyString())).thenReturn(List.of(
                new GeoPlace("Đà Lạt", null, "Lam Dong", "Việt Nam", "VN", "Địa danh", new BigDecimal("11.94646"),
                        new BigDecimal("108.44193")),
                new GeoPlace("Singapore", null, "Singapore", "Singapore", "SG", "Thành phố", new BigDecimal("1.28967"),
                        new BigDecimal("103.85007"))));

        mvc.perform(auth(get("/api/v1/geo/search").param("q", "  Đà   Lạt "), ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].label").value("Đà Lạt, Lam Dong, Việt Nam"))
                .andExpect(jsonPath("$[0].lat").value(11.94646))
                .andExpect(jsonPath("$[1].label").value("Singapore, Singapore"));
        mvc.perform(auth(get("/api/v1/geo/search").param("q", "đà lạt"), ownerToken))
                .andExpect(status().isOk());

        verify(weatherProvider, times(1)).search("Đà Lạt");
    }

    @Test
    void geoSearchValidatesQueryAndReportsOutage() throws Exception {
        mvc.perform(auth(get("/api/v1/geo/search").param("q", " a "), ownerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        when(weatherProvider.search(anyString())).thenThrow(new WeatherUnavailableException("down"));
        mvc.perform(auth(get("/api/v1/geo/search").param("q", "Phú Quốc"), ownerToken))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("GEO_SEARCH_UNAVAILABLE"));

        mvc.perform(get("/api/v1/geo/search").param("q", "Phú Quốc"))
                .andExpect(status().isUnauthorized());
    }
}
