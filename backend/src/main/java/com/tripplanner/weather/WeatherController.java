package com.tripplanner.weather;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.weather.dto.GeoPlaceResponse;
import com.tripplanner.weather.dto.TripWeatherResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Weather", description = "Dự báo thời tiết theo ngày (Open-Meteo) và tìm địa điểm")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping("/trips/{tripId}/weather")
    @Operation(summary = "Thời tiết từng ngày của chuyến (VIEWER+). API ngoài lỗi → status UNAVAILABLE, vẫn 200")
    public TripWeatherResponse tripWeather(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return weatherService.tripWeather(tripId, CurrentUser.id(jwt));
    }

    @GetMapping("/geo/search")
    @Operation(summary = "Gợi ý địa điểm theo tên (tối đa 8). Open-Meteo lỗi → 503 GEO_SEARCH_UNAVAILABLE")
    public List<GeoPlaceResponse> search(@Parameter(description = "Tên địa điểm, 2–100 ký tự")
                                         @RequestParam(name = "q", required = false) String q) {
        return weatherService.search(q);
    }
}
