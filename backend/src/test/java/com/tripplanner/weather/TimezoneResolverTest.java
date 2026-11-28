package com.tripplanner.weather;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class TimezoneResolverTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-29T00:00:00Z"), ZoneOffset.UTC);
    private static final Coordinates DA_LAT = new Coordinates(new BigDecimal("11.94"), new BigDecimal("108.44"));
    private static final Coordinates DA_LAT_NEAR = new Coordinates(new BigDecimal("11.9412"), new BigDecimal("108.4381"));
    private static final Coordinates TOKYO = new Coordinates(new BigDecimal("35.68"), new BigDecimal("139.69"));

    private final WeatherProvider provider = mock(WeatherProvider.class);

    private TimezoneResolver resolver(boolean enabled) {
        return new TimezoneResolver(provider, enabled, CLOCK, Duration.ofMinutes(2), 300);
    }

    @Test
    void asksProviderOncePerRoundedLocation() {
        when(provider.timezone(any())).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        TimezoneResolver r = resolver(true);
        assertThat(r.resolve(DA_LAT)).isEqualTo(ZoneId.of("Asia/Ho_Chi_Minh"));
        assertThat(r.resolve(DA_LAT_NEAR)).isEqualTo(ZoneId.of("Asia/Ho_Chi_Minh"));
        verify(provider, times(1)).timezone(any());
    }

    @Test
    void usesProviderZoneAbroad() {
        when(provider.timezone(any())).thenReturn(ZoneId.of("Asia/Tokyo"));
        assertThat(resolver(true).resolve(TOKYO)).isEqualTo(ZoneId.of("Asia/Tokyo"));
    }

    @Test
    void failureFallsBackToVietnamOnlyInsideVietnam() {
        when(provider.timezone(any())).thenThrow(new WeatherUnavailableException("timeout"));
        TimezoneResolver r = resolver(true);
        assertThat(r.resolve(DA_LAT)).isEqualTo(TimezoneResolver.VIETNAM);
        assertThat(r.resolve(TOKYO)).isNull();
        // Mock trả null (không có dữ liệu) cũng là lỗi
        doReturn(null).when(provider).timezone(any());
        assertThat(resolver(true).resolve(TOKYO)).isNull();
    }

    @Test
    void disabledNeverCallsTheNetwork() {
        TimezoneResolver r = resolver(false);
        assertThat(r.resolve(DA_LAT)).isEqualTo(TimezoneResolver.VIETNAM);
        assertThat(r.resolve(TOKYO)).isNull();
        assertThat(r.resolve(null)).isNull();
        verify(provider, never()).timezone(any());
    }
}
