package com.tripplanner.weather;

import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.weather.model.GeoPlace;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class GeoResultsTest {

    private static GeoPlace place(String name, String countryCode, String lat, String lon) {
        return new GeoPlace(name, null, null, null, countryCode, "Địa danh", new BigDecimal(lat), new BigDecimal(lon));
    }

    @Test
    void keyDropsMarksCaseAndAdminPrefix() {
        assertThat(GeoResults.key("Phường Mộc Châu")).isEqualTo("moc chau");
        assertThat(GeoResults.key("Xã  Tà Xùa")).isEqualTo("ta xua");
        assertThat(GeoResults.key("Thành Phố Đà Lạt")).isEqualTo("da lat");
        assertThat(GeoResults.key("Đặc khu Cô Tô")).isEqualTo("co to");
        assertThat(GeoResults.key("Xa Lộ")).isEqualTo("xa lo");   // "xa" không có dấu cách sau: không phải tiền tố
    }

    @Test
    void sameNameNearbyIsDuplicateButFarAwayIsNot() {
        GeoPlace mocChau = place("Mộc Châu", "VN", "20.8361", "104.6406");
        GeoPlace ward = place("Phường Mộc Châu", "VN", "20.85", "104.65");
        GeoPlace villageLaoCai = place("Tà Xùa", "VN", "21.445", "104.360");
        GeoPlace communeSonLa = place("Xã Tà Xùa", "VN", "21.322", "104.440");
        assertThat(GeoResults.samePlace(mocChau, ward)).isTrue();
        assertThat(GeoResults.samePlace(villageLaoCai, communeSonLa)).isFalse();   // cách ~16 km: 2 nơi
    }

    @Test
    void mergeKeepsFirstSourceOrderDedupesAndPutsVietnamFirst() {
        GeoPlace chinaSide = place("Thác Bản Giốc", "CN", "22.80", "106.72");
        GeoPlace vnSide = place("Thác Bản Giốc", "VN", "22.95", "106.86");   // khác nước, cách >11 km
        GeoPlace daLat = place("Đà Lạt", "VN", "11.94646", "108.44193");
        GeoPlace daLatOsm = place("Thành phố Đà Lạt", "VN", "11.94", "108.45");

        List<GeoPlace> merged = GeoResults.merge("Đà Lạt", List.of(daLat, chinaSide), List.of(daLatOsm, vnSide), 8);

        assertThat(merged).containsExactly(daLat, vnSide, chinaSide);
    }

    @Test
    void exactNameBeatsLooseMatchAcrossSources() {
        GeoPlace phuLuong = place("Phu Lương", "VN", "21.5", "104.3");          // Open-Meteo, sai tên
        GeoPlace puLuong = place("Pù Luông", "VN", "20.4", "105.2");            // Photon, đúng tên
        GeoPlace reserve = place("Khu bảo tồn thiên nhiên Pù Luông", "VN", "20.45", "105.25");
        GeoPlace abroad = place("Pu Luong", "LA", "19.0", "102.0");

        List<GeoPlace> merged = GeoResults.merge("pù  luông", List.of(phuLuong, abroad), List.of(reserve, puLuong), 8);

        assertThat(merged).containsExactly(puLuong, reserve, phuLuong, abroad);
        assertThat(GeoResults.matchRank("pu luong", "pu luong")).isZero();
    }

    @Test
    void mergeCutsToLimit() {
        List<GeoPlace> many = List.of(place("A", "VN", "1", "1"), place("B", "VN", "2", "2"), place("C", "VN", "3", "3"));
        assertThat(GeoResults.merge("A", many, List.of(), 2)).hasSize(2);
    }
}
