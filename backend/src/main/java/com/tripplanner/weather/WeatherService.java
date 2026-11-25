package com.tripplanner.weather;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.config.AppProperties;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripRole;
import com.tripplanner.tripday.TripDayRepository;
import com.tripplanner.weather.dto.DayWeatherResponse;
import com.tripplanner.weather.dto.ForecastResponse;
import com.tripplanner.weather.dto.GeoPlaceResponse;
import com.tripplanner.weather.dto.TripWeatherResponse;
import com.tripplanner.weather.model.ForecastSnapshot;
import com.tripplanner.weather.model.GeoPlace;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Thời tiết theo ngày của chuyến + tìm địa điểm (docs/sdd-weather.md). Đọc DB trong 1 transaction ngắn rồi mới gọi
 * API ngoài, để không giữ kết nối DB trong lúc chờ mạng. Lỗi API không bao giờ thành 5xx của endpoint thời tiết.
 */
@Service
public class WeatherService {

    static final int MIN_QUERY = 2;
    static final int MAX_QUERY = 100;

    /** Dữ liệu đã đọc từ DB (thuần, dùng ngoài transaction). */
    private record DayInfo(Long id, int dayIndex, LocalDate date) {
    }

    private record TripInfo(String destination, Coordinates location, List<DayInfo> days) {
    }

    private final WeatherProvider provider;
    private final AppProperties.Weather config;
    private final Clock clock;
    private final TripAccessService accessService;
    private final TripDayRepository dayRepository;
    private final TransactionTemplate readOnlyTx;
    private final WeatherCache<ForecastSnapshot> forecasts;
    private final WeatherCache<List<GeoPlace>> places;

    public WeatherService(WeatherProvider provider, AppProperties properties, Clock clock,
                          TripAccessService accessService, TripDayRepository dayRepository,
                          PlatformTransactionManager transactionManager) {
        this.provider = provider;
        this.config = properties.weather();
        this.clock = clock;
        this.accessService = accessService;
        this.dayRepository = dayRepository;
        this.readOnlyTx = new TransactionTemplate(transactionManager);
        this.readOnlyTx.setReadOnly(true);
        Duration negative = Duration.ofSeconds(config.negativeTtlSeconds());
        this.forecasts = new WeatherCache<>(clock, Duration.ofMinutes(config.cacheTtlMinutes()),
                Duration.ofHours(config.staleMaxHours()), negative, config.maxEntries());
        this.places = new WeatherCache<>(clock, Duration.ofHours(24), Duration.ofHours(48), negative,
                config.maxEntries());
    }

    public List<GeoPlaceResponse> search(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim().replaceAll("\\s+", " ");
        if (query.length() < MIN_QUERY || query.length() > MAX_QUERY) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Nhập từ " + MIN_QUERY + " đến " + MAX_QUERY + " ký tự để tìm địa điểm");
        }
        if (!config.enabled()) {
            throw new BusinessException(ErrorCode.GEO_SEARCH_UNAVAILABLE);
        }
        try {
            return places.get(query.toLowerCase(Locale.ROOT), () -> List.copyOf(provider.search(query))).stream()
                    .map(GeoPlaceResponse::from)
                    .toList();
        } catch (WeatherUnavailableException e) {
            throw new BusinessException(ErrorCode.GEO_SEARCH_UNAVAILABLE);
        }
    }

    public TripWeatherResponse tripWeather(Long tripId, Long userId) {
        TripInfo trip = readOnlyTx.execute(status -> load(tripId, userId));
        LocalDate today = LocalDate.now(clock);
        int forecastDays = config.forecastDays();

        ForecastSnapshot snapshot = null;
        boolean needed = trip.location() != null
                && trip.days().stream().anyMatch(d -> ForecastWindow.needsForecast(d.date(), today, forecastDays));
        if (needed && config.enabled()) {
            Coordinates point = trip.location().rounded();
            try {
                snapshot = forecasts.get(point.cacheKey(),
                        () -> ForecastSnapshot.of(clock.instant(), provider.forecast(point)));
            } catch (WeatherUnavailableException e) {
                snapshot = null;   // các ngày trong tầm → UNAVAILABLE
            }
        }

        String placeName = trip.location() == null ? null : trip.destination();
        List<DayWeatherResponse> days = new ArrayList<>(trip.days().size());
        boolean anyForecast = false;
        for (DayInfo day : trip.days()) {
            ForecastWindow.Decision decision =
                    ForecastWindow.classify(day.date(), trip.location() != null, today, forecastDays, snapshot);
            anyForecast |= decision.status() == WeatherStatus.FORECAST;
            days.add(new DayWeatherResponse(day.id(), day.dayIndex(), day.date(), placeName, decision.status(),
                    decision.availableFrom(),
                    decision.forecast() == null ? null : ForecastResponse.from(decision.forecast())));
        }
        Instant fetchedAt = anyForecast ? snapshot.fetchedAt() : null;
        return new TripWeatherResponse(TripWeatherResponse.SOURCE, fetchedAt, days);
    }

    /** Chỉ cho test: xóa cache giữa các test case (bean dùng chung trong Spring context). */
    void clearCaches() {
        forecasts.clear();
        places.clear();
    }

    private TripInfo load(Long tripId, Long userId) {
        Trip trip = accessService.require(tripId, userId, TripRole.VIEWER).getTrip();
        Coordinates location = trip.getDestinationLat() == null || trip.getDestinationLon() == null
                ? null : new Coordinates(trip.getDestinationLat(), trip.getDestinationLon());
        List<DayInfo> days = dayRepository.findAllByTripId(tripId).stream()
                .map(d -> new DayInfo(d.getId(), d.getDayIndex(), d.dateIn(trip)))
                .toList();
        return new TripInfo(trip.getDestination(), location, days);
    }
}
