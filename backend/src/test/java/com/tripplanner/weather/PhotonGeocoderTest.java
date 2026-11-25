package com.tripplanner.weather;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.tripplanner.weather.model.GeoPlace;
import java.util.List;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class PhotonGeocoderTest {

    private static final String URL = "https://photon.test/api/";

    /** Rút gọn từ phản hồi thật của photon.komoot.io cho "Tà Xùa". */
    static final String TA_XUA = """
            {"type":"FeatureCollection","features":[
              {"type":"Feature","geometry":{"type":"Point","coordinates":[104.3598851,21.4452756]},
               "properties":{"osm_key":"place","osm_value":"village","name":"Tà Xùa","county":"Xã Hạnh Phúc",
                             "state":"Lào Cai","country":"Việt Nam","countrycode":"VN"}},
              {"type":"Feature","geometry":{"type":"Point","coordinates":[104.48,21.31]},
               "properties":{"osm_key":"waterway","osm_value":"waterfall","state":"Lào Cai","countrycode":"VN"}},
              {"type":"Feature","geometry":{"type":"Point","coordinates":[104.47,21.32]},
               "properties":{"osm_key":"highway","osm_value":"path","name":"Ta Xua Trail","countrycode":"VN"}},
              {"type":"Feature","geometry":{"type":"Point","coordinates":[104.49,21.33]},
               "properties":{"osm_key":"tourism","osm_value":"hotel","name":"Tà Xùa Homestay","countrycode":"VN"}},
              {"type":"Feature","geometry":{"type":"Point","coordinates":[104.4401,21.3218]},
               "properties":{"osm_key":"boundary","osm_value":"administrative","name":"Xã Tà Xùa",
                             "state":"Tỉnh Sơn La","country":"Việt Nam","countrycode":"VN"}}
            ]}""";

    @Test
    void keepsOnlyDestinationsAndMapsFields() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(Matchers.startsWith(URL)))
                .andExpect(queryParam("q", "T%C3%A0%20X%C3%B9a"))
                .andExpect(queryParam("limit", "15"))
                .andExpect(header("User-Agent", PhotonGeocoder.USER_AGENT))
                .andRespond(withSuccess(TA_XUA, MediaType.APPLICATION_JSON));

        List<GeoPlace> places = new PhotonGeocoder(builder.build(), URL).search("Tà Xùa");

        // Thác không tên, đường mòn, khách sạn bị bỏ
        assertThat(places).extracting(GeoPlace::name).containsExactly("Tà Xùa", "Xã Tà Xùa");
        GeoPlace village = places.get(0);
        assertThat(village.area()).isEqualTo("Xã Hạnh Phúc");
        assertThat(village.region()).isEqualTo("Lào Cai");
        assertThat(village.kind()).isEqualTo("Làng/bản");
        assertThat(village.lat()).isEqualByComparingTo("21.4452756");   // GeoJSON là [lon, lat]
        assertThat(village.lon()).isEqualByComparingTo("104.3598851");
        assertThat(places.get(1).kind()).isEqualTo("Đơn vị hành chính");
        assertThat(places.get(1).region()).isEqualTo("Tỉnh Sơn La");
        server.verify();
    }

    @Test
    void errorBecomesUnavailable() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(Matchers.startsWith(URL))).andRespond(withServerError());
        assertThatThrownBy(() -> new PhotonGeocoder(builder.build(), URL).search("x"))
                .isInstanceOf(WeatherUnavailableException.class);
    }
}
