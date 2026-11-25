package com.tripplanner.weather;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.tripplanner.config.AppProperties;
import com.tripplanner.weather.model.DailyForecast;
import com.tripplanner.weather.model.GeoPlace;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class OpenMeteoProviderTest {

    private static final String FORECAST = "https://api.test/v1/forecast";
    private static final String GEO = "https://geo.test/v1/search";

    private static AppProperties.Weather config(String apiKey) {
        return config(apiKey, "");
    }

    private static AppProperties.Weather config(String apiKey, String photonUrl) {
        return new AppProperties.Weather(true, FORECAST, GEO, photonUrl, "https://archive.test/v1/archive", apiKey, 16,
                120, 24, 120, 300, 2000, 3000);
    }

    private MockRestServiceServer server;

    private OpenMeteoProvider provider(String apiKey) {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        return new OpenMeteoProvider(builder.build(), config(apiKey));
    }

    @Test
    void searchNormalizesIcelandicEthAndEncodesQuery() {
        OpenMeteoProvider provider = provider("");
        server.expect(requestTo(Matchers.startsWith(GEO)))
                .andExpect(queryParam("name", "%C4%90%C3%A0%20L%E1%BA%A1t%20%26%20co"))
                .andExpect(queryParam("language", "vi"))
                .andExpect(queryParam("count", "8"))
                .andRespond(withSuccess("""
                        {"results":[
                          {"id":1584071,"name":"Ðà Lạt","latitude":11.94646,"longitude":108.44193,
                           "country_code":"VN","country":"Việt Nam","admin1":"Lam Dong"},
                          {"id":2,"name":"Hội An","latitude":15.87944,"longitude":108.335,
                           "country":"Việt Nam","admin1":"Ðà Nẵng"},
                          {"id":3,"name":"Thiếu tọa độ"}
                        ]}""", MediaType.APPLICATION_JSON));

        List<GeoPlace> places = provider.search("Đà Lạt & co");

        assertThat(places).hasSize(2);
        assertThat(places.get(0).name()).isEqualTo("Đà Lạt");
        assertThat(places.get(0).region()).isEqualTo("Lam Dong");
        assertThat(places.get(0).countryCode()).isEqualTo("VN");
        assertThat(places.get(0).lat()).isEqualByComparingTo("11.94646");
        assertThat(places.get(1).region()).isEqualTo("Đà Nẵng");
        assertThat(places.get(1).countryCode()).isNull();
        server.verify();
    }

    @Test
    void searchWithoutResultsIsEmpty() {
        OpenMeteoProvider provider = provider("");
        server.expect(requestTo(Matchers.startsWith(GEO)))
                .andRespond(withSuccess("{\"generationtime_ms\":0.2}", MediaType.APPLICATION_JSON));
        assertThat(provider.search("zzzz")).isEmpty();
    }

    @Test
    void forecastParsesDailyArraysWithNulls() {
        OpenMeteoProvider provider = provider("");
        Coordinates point = new Coordinates(new BigDecimal("11.95"), new BigDecimal("108.44"));
        server.expect(requestTo(Matchers.startsWith(FORECAST)))
                .andExpect(queryParam("latitude", "11.95000"))
                .andExpect(queryParam("longitude", "108.44000"))
                .andExpect(queryParam("timezone", "auto"))
                .andExpect(queryParam("forecast_days", "16"))
                .andRespond(withSuccess("""
                        {"daily":{
                          "time":["2026-11-25","2026-11-26"],
                          "weather_code":[80,3],
                          "temperature_2m_max":[25.0,24.7],
                          "temperature_2m_min":[15.9,15.7],
                          "precipitation_probability_max":[96,null],
                          "precipitation_sum":[7.4,0.0],
                          "wind_speed_10m_max":[18.0,9.5],
                          "uv_index_max":[6.45,null]}}""", MediaType.APPLICATION_JSON));

        List<DailyForecast> days = provider.forecast(point);

        assertThat(days).hasSize(2);
        assertThat(days.get(0)).isEqualTo(new DailyForecast(LocalDate.of(2026, 11, 25), 80, 15.9, 25.0, 96, 7.4,
                18.0, 6.45));
        assertThat(days.get(1).precipProbability()).isNull();
        assertThat(days.get(1).uvMax()).isNull();
        server.verify();
    }

    @Test
    void apiKeyIsSentWhenConfigured() {
        OpenMeteoProvider provider = provider("secret-key");
        server.expect(requestTo(Matchers.startsWith(FORECAST)))
                .andExpect(queryParam("apikey", "secret-key"))
                .andRespond(withSuccess("{\"daily\":{\"time\":[]}}", MediaType.APPLICATION_JSON));
        assertThat(provider.forecast(new Coordinates(BigDecimal.ONE, BigDecimal.TEN))).isEmpty();
        server.verify();
    }

    @Test
    void httpErrorOrMalformedBodyBecomesUnavailable() {
        OpenMeteoProvider provider = provider("");
        Coordinates point = new Coordinates(BigDecimal.ONE, BigDecimal.TEN);
        server.expect(requestTo(Matchers.startsWith(FORECAST))).andRespond(withServerError());
        assertThatThrownBy(() -> provider.forecast(point)).isInstanceOf(WeatherUnavailableException.class);

        server.reset();
        server.expect(requestTo(Matchers.startsWith(FORECAST)))
                .andRespond(withSuccess("{\"error\":true}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> provider.forecast(point)).isInstanceOf(WeatherUnavailableException.class);
    }

    private static final String PHOTON = "https://photon.test/api/";
    private static final String OPEN_METEO_DA_LAT = """
            {"results":[{"name":"Ðà Lạt","latitude":11.94646,"longitude":108.44193,"country_code":"VN",
                         "country":"Việt Nam","admin1":"Lam Dong","admin2":"Thành Phố Đà Lạt","feature_code":"PPLA"}]}""";

    /** Bật Photon: 2 nguồn gọi song song nên không ràng buộc thứ tự request. */
    private OpenMeteoProvider providerWithPhoton() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).ignoreExpectOrder(true).build();
        return new OpenMeteoProvider(builder.build(), config("", PHOTON));
    }

    @Test
    void searchMergesBothSourcesOpenMeteoFirst() {
        OpenMeteoProvider provider = providerWithPhoton();
        server.expect(requestTo(Matchers.startsWith(GEO)))
                .andRespond(withSuccess(OPEN_METEO_DA_LAT, MediaType.APPLICATION_JSON));
        server.expect(requestTo(Matchers.startsWith(PHOTON)))
                .andRespond(withSuccess(PhotonGeocoderTest.TA_XUA, MediaType.APPLICATION_JSON));

        List<GeoPlace> places = provider.search("Đà Lạt");

        assertThat(places).extracting(GeoPlace::name).containsExactly("Đà Lạt", "Tà Xùa", "Xã Tà Xùa");
        assertThat(places.get(0).area()).isNull();   // "Thành Phố Đà Lạt" trùng tên → bỏ
        assertThat(places.get(0).kind()).isEqualTo("Địa danh");
        server.verify();
    }

    @Test
    void searchFallsBackToTheSourceThatWorks() {
        OpenMeteoProvider provider = providerWithPhoton();
        server.expect(requestTo(Matchers.startsWith(GEO))).andRespond(withServerError());
        server.expect(requestTo(Matchers.startsWith(PHOTON)))
                .andRespond(withSuccess(PhotonGeocoderTest.TA_XUA, MediaType.APPLICATION_JSON));
        assertThat(provider.search("Tà Xùa")).extracting(GeoPlace::name).containsExactly("Tà Xùa", "Xã Tà Xùa");

        provider = providerWithPhoton();
        server.expect(requestTo(Matchers.startsWith(GEO)))
                .andRespond(withSuccess(OPEN_METEO_DA_LAT, MediaType.APPLICATION_JSON));
        server.expect(requestTo(Matchers.startsWith(PHOTON))).andRespond(withServerError());
        assertThat(provider.search("Đà Lạt")).extracting(GeoPlace::name).containsExactly("Đà Lạt");
    }

    @Test
    void searchFailsOnlyWhenBothSourcesFail() {
        OpenMeteoProvider provider = providerWithPhoton();
        server.expect(requestTo(Matchers.startsWith(GEO))).andRespond(withServerError());
        server.expect(requestTo(Matchers.startsWith(PHOTON))).andRespond(withServerError());
        assertThatThrownBy(() -> provider.search("x")).isInstanceOf(WeatherUnavailableException.class);
    }

    @Test
    void geoNamesFeatureCodesHaveVietnameseKinds() {
        assertThat(OpenMeteoProvider.geoNamesKind("PPLC")).isEqualTo("Thủ đô");
        assertThat(OpenMeteoProvider.geoNamesKind("ADM2")).isEqualTo("Đơn vị hành chính");
        assertThat(OpenMeteoProvider.geoNamesKind("ISL")).isEqualTo("Đảo");
        assertThat(OpenMeteoProvider.geoNamesKind(null)).isEqualTo("Địa danh");
    }

    @Test
    void coordinatesValidateRangeAndRound() {
        Coordinates c = new Coordinates(new BigDecimal("11.946463"), new BigDecimal("108.441934"));
        assertThat(c.lat()).isEqualByComparingTo("11.94646");
        assertThat(c.cacheKey()).isEqualTo("11.95,108.44");
        assertThat(c.rounded().lat()).isEqualByComparingTo("11.95");
        assertThat(Coordinates.ofNullable(null, null)).isNull();
        assertThatThrownBy(() -> Coordinates.ofNullable(BigDecimal.ONE, null)).hasMessageContaining("Vị trí");
        assertThatThrownBy(() -> new Coordinates(new BigDecimal("91"), BigDecimal.ONE)).hasMessageContaining("Vị trí");
        assertThatThrownBy(() -> new Coordinates(BigDecimal.ONE, new BigDecimal("-180.5")))
                .hasMessageContaining("Vị trí");
    }
}
