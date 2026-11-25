package com.tripplanner.weather;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class WeatherCacheTest {

    /** Đồng hồ chỉnh được bằng tay. */
    static final class TestClock extends Clock {
        private Instant now = Instant.parse("2026-11-25T01:00:00Z");

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private final TestClock clock = new TestClock();
    private final WeatherCache<String> cache = new WeatherCache<>(clock, Duration.ofHours(2), Duration.ofHours(24),
            Duration.ofMinutes(2), 3);
    private final AtomicInteger calls = new AtomicInteger();

    private String load() {
        return "v" + calls.incrementAndGet();
    }

    private String fail() {
        calls.incrementAndGet();
        throw new WeatherUnavailableException("lỗi");
    }

    @Test
    void freshValueIsNotReloaded() {
        assertThat(cache.get("k", this::load)).isEqualTo("v1");
        clock.advance(Duration.ofMinutes(119));
        assertThat(cache.get("k", this::load)).isEqualTo("v1");
        assertThat(calls).hasValue(1);
    }

    @Test
    void expiredValueIsReloaded() {
        cache.get("k", this::load);
        clock.advance(Duration.ofMinutes(121));
        assertThat(cache.get("k", this::load)).isEqualTo("v2");
        assertThat(cache.fetchedAt("k")).isEqualTo(clock.instant());
    }

    @Test
    void failureServesStaleValueAndBacksOffForTwoMinutes() {
        cache.get("k", this::load);
        clock.advance(Duration.ofHours(3));
        assertThat(cache.get("k", this::fail)).isEqualTo("v1");   // bản cũ
        assertThat(calls).hasValue(2);

        clock.advance(Duration.ofMinutes(1));
        assertThat(cache.get("k", this::load)).isEqualTo("v1");   // còn trong negative TTL: không gọi
        assertThat(calls).hasValue(2);

        clock.advance(Duration.ofMinutes(2));
        assertThat(cache.get("k", this::load)).isEqualTo("v3");   // hết negative TTL: gọi lại
    }

    @Test
    void staleValueOlderThanLimitIsNotServed() {
        cache.get("k", this::load);
        clock.advance(Duration.ofHours(25));
        assertThatThrownBy(() -> cache.get("k", this::fail)).isInstanceOf(WeatherUnavailableException.class);
    }

    @Test
    void failureWithoutAnyValueThrowsAndIsRemembered() {
        assertThatThrownBy(() -> cache.get("k", this::fail)).isInstanceOf(WeatherUnavailableException.class);
        assertThatThrownBy(() -> cache.get("k", this::load)).isInstanceOf(WeatherUnavailableException.class);
        assertThat(calls).hasValue(1);
    }

    @Test
    void leastRecentlyUsedKeyIsEvicted() {
        cache.get("a", this::load);
        cache.get("b", this::load);
        cache.get("c", this::load);
        cache.get("a", this::load);   // a vừa dùng → b là cũ nhất
        cache.get("d", this::load);
        assertThat(cache.size()).isEqualTo(3);
        assertThat(cache.fetchedAt("b")).isNull();
        assertThat(cache.fetchedAt("a")).isNotNull();
    }

    @Test
    void concurrentRequestsForSameKeyCallLoaderOnce() throws Exception {
        CountDownLatch release = new CountDownLatch(1);
        AtomicInteger slowCalls = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(10);
        try {
            List<Future<String>> results = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                results.add(pool.submit(() -> cache.get("k", () -> {
                    slowCalls.incrementAndGet();
                    try {
                        release.await(5, TimeUnit.SECONDS);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    return "shared";
                })));
            }
            Thread.sleep(200);   // để cả 10 luồng vào hàng chờ
            release.countDown();
            for (Future<String> result : results) {
                assertThat(result.get(5, TimeUnit.SECONDS)).isEqualTo("shared");
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(slowCalls).hasValue(1);
    }
}
