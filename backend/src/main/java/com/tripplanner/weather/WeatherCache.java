package com.tripplanner.weather;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Cache trong bộ nhớ cho dữ liệu thời tiết (không Redis, không thư viện; hợp VPS 1 GB):
 * <ul>
 *   <li>còn tươi ({@code ttl}) → trả luôn, không gọi API;</li>
 *   <li>hết tươi → gọi lại; lỗi thì trả bản cũ nếu chưa quá {@code staleMax}, và nhớ lỗi {@code negativeTtl}
 *       để các request sau không gọi lại ngay (tránh dồn request chờ timeout);</li>
 *   <li>single-flight: nhiều request cùng khóa cùng lúc → chỉ 1 lượt gọi;</li>
 *   <li>tối đa {@code maxEntries} khóa, bỏ khóa lâu không dùng nhất (LRU).</li>
 * </ul>
 * Lỗi mà không có bản cũ dùng được → ném {@link WeatherUnavailableException}.
 */
public class WeatherCache<V> {

    private record Slot<V>(V value, Instant fetchedAt, Instant failedAt) {
    }

    private final Clock clock;
    private final Duration ttl;
    private final Duration staleMax;
    private final Duration negativeTtl;
    private final Map<String, Slot<V>> entries;
    private final ConcurrentHashMap<String, CompletableFuture<V>> inflight = new ConcurrentHashMap<>();

    public WeatherCache(Clock clock, Duration ttl, Duration staleMax, Duration negativeTtl, int maxEntries) {
        this.clock = clock;
        this.ttl = ttl;
        this.staleMax = staleMax;
        this.negativeTtl = negativeTtl;
        this.entries = new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, Slot<V>> eldest) {
                return size() > maxEntries;
            }
        };
    }

    public V get(String key, Supplier<V> loader) {
        Slot<V> entry = entry(key);
        Instant now = clock.instant();
        if (isFresh(entry, now)) {
            return entry.value();
        }
        if (entry != null && entry.failedAt() != null && entry.failedAt().plus(negativeTtl).isAfter(now)) {
            return staleOrThrow(entry, now);   // vừa lỗi, chưa thử lại
        }

        CompletableFuture<V> mine = new CompletableFuture<>();
        CompletableFuture<V> running = inflight.putIfAbsent(key, mine);
        if (running != null) {
            try {
                return running.join();
            } catch (CompletionException e) {
                return staleOrThrow(entry(key), clock.instant());
            }
        }
        try {
            Slot<V> latest = entry(key);   // request khác có thể vừa nạp xong
            if (isFresh(latest, clock.instant())) {
                mine.complete(latest.value());
                return latest.value();
            }
            V value = loader.get();
            put(key, new Slot<>(value, clock.instant(), null));
            mine.complete(value);
            return value;
        } catch (RuntimeException e) {
            Instant failedAt = clock.instant();
            Slot<V> old = entry(key);
            Slot<V> failed = new Slot<>(old == null ? null : old.value(), old == null ? null : old.fetchedAt(), failedAt);
            put(key, failed);
            mine.completeExceptionally(e);
            return staleOrThrow(failed, failedAt);
        } finally {
            inflight.remove(key, mine);
        }
    }

    /** Thời điểm lấy dữ liệu của bản đang lưu (để hiện "Cập nhật lúc"); null nếu chưa có. */
    public Instant fetchedAt(String key) {
        Slot<V> entry = entry(key);
        return entry == null ? null : entry.fetchedAt();
    }

    public synchronized void clear() {
        entries.clear();
    }

    public synchronized int size() {
        return entries.size();
    }

    // ---------------------------------------------------------------- helpers

    private boolean isFresh(Slot<V> entry, Instant now) {
        return entry != null && entry.value() != null && entry.failedAt() == null
                && entry.fetchedAt().plus(ttl).isAfter(now);
    }

    private V staleOrThrow(Slot<V> entry, Instant now) {
        if (entry != null && entry.value() != null && entry.fetchedAt().plus(staleMax).isAfter(now)) {
            return entry.value();
        }
        throw new WeatherUnavailableException("Không có dữ liệu thời tiết dùng được");
    }

    private synchronized Slot<V> entry(String key) {
        return entries.get(key);
    }

    private synchronized void put(String key, Slot<V> entry) {
        entries.put(key, entry);
    }
}
