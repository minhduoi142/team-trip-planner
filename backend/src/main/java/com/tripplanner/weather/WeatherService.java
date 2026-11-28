package com.tripplanner.weather;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.config.AppProperties;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripRepository;
import com.tripplanner.trip.TripRole;
import com.tripplanner.tripday.TripDay;
import com.tripplanner.tripday.TripDayRepository;
import com.tripplanner.weather.dto.DayWeatherResponse;
import com.tripplanner.weather.dto.ForecastResponse;
import com.tripplanner.weather.dto.GeoPlaceResponse;
import com.tripplanner.weather.dto.SunResponse;
import com.tripplanner.weather.dto.TripWeatherResponse;
import com.tripplanner.weather.model.ForecastSnapshot;
import com.tripplanner.weather.model.GeoPlace;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Thời tiết theo ngày của chuyến + tìm địa điểm (docs/sdd-weather.md). Đọc DB trong 1 transaction ngắn rồi mới gọi
 * API ngoài, để không giữ kết nối DB trong lúc chờ mạng. Lỗi API không bao giờ thành 5xx của endpoint thời tiết.
 * Vị trí hiệu lực của mỗi ngày = vị trí riêng của ngày (W2), không có thì vị trí của chuyến.
 */
@Service
public class WeatherService {

    static final int MIN_QUERY = 2;
    static final int MAX_QUERY = 100;

    /** 1 ngày đã đọc từ DB (thuần, dùng ngoài transaction). {@code location} = vị trí hiệu lực, có thể null. */
    private record DayInfo(Long id, int dayIndex, LocalDate date, String placeName, Coordinates location) {
    }

    private final WeatherProvider provider;
    private final AppProperties.Weather config;
    private final Clock clock;
    private final TripAccessService accessService;
    private final TripRepository tripRepository;
    private final TripDayRepository dayRepository;
    private final TransactionTemplate readOnlyTx;
    private final WeatherCache<ForecastSnapshot> forecasts;
    private final WeatherCache<List<GeoPlace>> places;
    private final TimezoneResolver timezones;

    public WeatherService(WeatherProvider provider, AppProperties properties, Clock clock,
                          TripAccessService accessService, TripRepository tripRepository,
                          TripDayRepository dayRepository, PlatformTransactionManager transactionManager) {
        this.provider = provider;
        this.config = properties.weather();
        this.clock = clock;
        this.accessService = accessService;
        this.tripRepository = tripRepository;
        this.dayRepository = dayRepository;
        this.readOnlyTx = new TransactionTemplate(transactionManager);
        this.readOnlyTx.setReadOnly(true);
        Duration negative = Duration.ofSeconds(config.negativeTtlSeconds());
        this.forecasts = new WeatherCache<>(clock, Duration.ofMinutes(config.cacheTtlMinutes()),
                Duration.ofHours(config.staleMaxHours()), negative, config.maxEntries());
        this.places = new WeatherCache<>(clock, Duration.ofHours(24), Duration.ofHours(48), negative,
                config.maxEntries());
        this.timezones = new TimezoneResolver(provider, config.enabled(), clock, negative, config.maxEntries());
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
        List<DayInfo> days = readOnlyTx.execute(status ->
                loadDays(accessService.require(tripId, userId, TripRole.VIEWER).getTrip()));
        return compute(days);
    }

    /**
     * Cho job hệ thống (email đếm ngược): không kiểm quyền. Chuyến không tồn tại → không có ngày nào.
     * Như endpoint, lỗi API chỉ thành status {@code UNAVAILABLE}, không ném ra ngoài.
     */
    public TripWeatherResponse tripWeatherForSystem(Long tripId) {
        List<DayInfo> days = readOnlyTx.execute(status ->
                tripRepository.findById(tripId).map(this::loadDays).orElse(List.of()));
        return compute(days);
    }

    /** Chỉ cho test: xóa cache giữa các test case (bean dùng chung trong Spring context). */
    void clearCaches() {
        forecasts.clear();
        places.clear();
        timezones.clear();
    }

    // ---------------------------------------------------------------- helpers

    private TripWeatherResponse compute(List<DayInfo> days) {
        LocalDate today = LocalDate.now(clock);
        int forecastDays = config.forecastDays();

        // Mỗi vị trí (làm tròn) chỉ lấy 1 lần, và chỉ khi có ngày nằm trong tầm dự báo
        Map<String, ForecastSnapshot> snapshots = new HashMap<>();
        for (DayInfo day : days) {
            if (day.location() == null || !config.enabled()
                    || !ForecastWindow.needsForecast(day.date(), today, forecastDays)) {
                continue;
            }
            Coordinates point = day.location().rounded();
            snapshots.computeIfAbsent(point.cacheKey(), key -> fetch(point));
        }

        List<DayWeatherResponse> result = new ArrayList<>(days.size());
        Instant oldest = null;
        for (DayInfo day : days) {
            ForecastSnapshot snapshot = day.location() == null ? null
                    : snapshots.get(day.location().rounded().cacheKey());
            ForecastWindow.Decision decision =
                    ForecastWindow.classify(day.date(), day.location() != null, today, forecastDays, snapshot);
            if (decision.status() == WeatherStatus.FORECAST
                    && (oldest == null || snapshot.fetchedAt().isBefore(oldest))) {
                oldest = snapshot.fetchedAt();
            }
            result.add(new DayWeatherResponse(day.id(), day.dayIndex(), day.date(), day.placeName(),
                    decision.status(), decision.availableFrom(),
                    decision.forecast() == null ? null : ForecastResponse.from(decision.forecast()),
                    decision.status() == WeatherStatus.PAST ? null : sun(day)));
        }
        return new TripWeatherResponse(TripWeatherResponse.SOURCE, oldest, result);
    }

    /** Giờ mặt trời của ngày; null khi chưa có ngày thực / vị trí, không biết múi giờ, hoặc vùng cực. */
    private SunResponse sun(DayInfo day) {
        if (day.date() == null || day.location() == null) {
            return null;
        }
        ZoneId zone = timezones.resolve(day.location());
        if (zone == null) {
            return null;
        }
        return SunTimes.of(day.date(), day.location().lat().doubleValue(), day.location().lon().doubleValue(), zone)
                .map(s -> SunResponse.from(s, zone))
                .orElse(null);
    }

    /** null nếu không lấy được (các ngày đó → UNAVAILABLE). */
    private ForecastSnapshot fetch(Coordinates point) {
        try {
            return forecasts.get(point.cacheKey(), () -> ForecastSnapshot.of(clock.instant(), provider.forecast(point)));
        } catch (WeatherUnavailableException e) {
            return null;
        }
    }

    private List<DayInfo> loadDays(Trip trip) {
        Coordinates tripLocation = Coordinates.ofNullableQuietly(trip.getDestinationLat(), trip.getDestinationLon());
        String tripPlace = tripLocation == null ? null : trip.getDestination();
        return dayRepository.findAllByTripId(trip.getId()).stream()
                .map(day -> toDayInfo(day, trip, tripPlace, tripLocation))
                .toList();
    }

    private static DayInfo toDayInfo(TripDay day, Trip trip, String tripPlace, Coordinates tripLocation) {
        Coordinates own = day.getPlaceName() == null ? null
                : Coordinates.ofNullableQuietly(day.getPlaceLat(), day.getPlaceLon());
        return own != null
                ? new DayInfo(day.getId(), day.getDayIndex(), day.dateIn(trip), day.getPlaceName(), own)
                : new DayInfo(day.getId(), day.getDayIndex(), day.dateIn(trip), tripPlace, tripLocation);
    }
}
