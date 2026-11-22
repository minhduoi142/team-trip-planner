package com.tripplanner.share;

import com.tripplanner.config.AppProperties;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripMemberRepository;
import com.tripplanner.trip.TripRepository;
import io.swagger.v3.oas.annotations.Hidden;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;
import java.util.StringJoiner;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

/**
 * Trang xem trước khi share link (PUBLIC, không qua /api): thẻ Open Graph cho Zalo/Messenger/Facebook rồi tự
 * chuyển tới FE /join/{code}. Chỉ có tác dụng thật khi backend được truy cập công khai.
 */
@Hidden
@RestController
@RequiredArgsConstructor
public class SharePageController {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final TripRepository tripRepository;
    private final TripMemberRepository memberRepository;
    private final CoverImageRenderer renderer;
    private final AppProperties properties;

    @GetMapping(value = "/share/{code}", produces = MediaType.TEXT_HTML_VALUE)
    @Transactional(readOnly = true)
    public ResponseEntity<String> page(@PathVariable String code) {
        String normalized = code.trim().toUpperCase(Locale.ROOT);
        Optional<Trip> trip = tripRepository.findByInviteCode(normalized);
        String frontend = trimSlash(properties.frontendUrl());
        if (trip.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8))
                    .body(notFoundPage(frontend));
        }
        Trip t = trip.get();
        long members = memberRepository.countByIdTripId(t.getId());
        String joinUrl = frontend + "/join/" + normalized;
        String imageUrl = trimSlash(properties.publicBaseUrl()) + "/share/" + normalized + "/cover.png";
        String html = sharePage(t.getTitle(), description(t, members), imageUrl, joinUrl,
                trimSlash(properties.publicBaseUrl()) + "/share/" + normalized);
        return ResponseEntity.ok()
                .contentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8))
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES))
                .body(html);
    }

    /** Ảnh bìa URL http(s) → 302 tới ảnh đó; preset/chưa có → vẽ PNG gradient. */
    @GetMapping("/share/{code}/cover.png")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> cover(@PathVariable String code) {
        Optional<Trip> trip = tripRepository.findByInviteCode(code.trim().toUpperCase(Locale.ROOT));
        if (trip.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        String cover = trip.get().getCoverImageUrl();
        if (cover != null && (cover.startsWith("http://") || cover.startsWith("https://"))) {
            return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(cover)).build();
        }
        byte[] png = renderer.renderPng(CoverImageRenderer.presetKey(cover, trip.get().getId()));
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS))
                .body(png);
    }

    // ---------------------------------------------------------------- HTML

    static String description(Trip t, long members) {
        StringJoiner parts = new StringJoiner(" · ");
        if (t.getDestination() != null) {
            parts.add(t.getDestination());
        }
        if (t.getStartDate() != null) {
            parts.add(t.getStartDate().format(DATE) + " – " + t.getEndDate().format(DATE));
        } else if (t.getPlannedStartDate() != null) {
            parts.add("Dự kiến " + t.getPlannedStartDate().format(DATE) + " – " + t.getPlannedEndDate().format(DATE));
        } else {
            parts.add("Đang chốt lịch");
        }
        parts.add("Cùng " + members + " người lên kế hoạch");
        return parts.toString();
    }

    private static String sharePage(String title, String description, String imageUrl, String joinUrl, String selfUrl) {
        String t = esc(title);
        String d = esc(description);
        String img = esc(imageUrl);
        String join = esc(joinUrl);
        return """
                <!doctype html>
                <html lang="vi">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>%1$s · Trip Planner</title>
                  <meta name="description" content="%2$s">
                  <meta property="og:type" content="website">
                  <meta property="og:site_name" content="Trip Planner">
                  <meta property="og:title" content="%1$s">
                  <meta property="og:description" content="%2$s">
                  <meta property="og:image" content="%3$s">
                  <meta property="og:image:width" content="1200">
                  <meta property="og:image:height" content="630">
                  <meta property="og:url" content="%5$s">
                  <meta name="twitter:card" content="summary_large_image">
                  <meta name="twitter:title" content="%1$s">
                  <meta name="twitter:description" content="%2$s">
                  <meta name="twitter:image" content="%3$s">
                  <meta http-equiv="refresh" content="0;url=%4$s">
                  <style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fff1f2;color:#4c0519}a{color:#e11d48}</style>
                </head>
                <body>
                  <p>Đang mở lời mời <b>%1$s</b>… <a href="%4$s">Bấm vào đây nếu không tự chuyển</a></p>
                  <script>location.replace(%6$s)</script>
                </body>
                </html>
                """.formatted(t, d, img, join, esc(selfUrl), jsString(joinUrl));
    }

    private static String notFoundPage(String frontend) {
        String home = esc(frontend + "/");
        return """
                <!doctype html>
                <html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Lời mời không còn hiệu lực · Trip Planner</title></head>
                <body style="font-family:system-ui,sans-serif;text-align:center;padding:48px">
                <h1>Lời mời không còn hiệu lực 🥲</h1><p>Có thể trưởng nhóm đã đổi mã mời. Hãy xin link mới nhé.</p>
                <p><a href="%s">Về trang chủ</a></p></body></html>
                """.formatted(home);
    }

    private static String esc(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value, StandardCharsets.UTF_8.name());
    }

    /** Chuỗi JS an toàn trong <script> (escape \, ", <, >, &, ký tự xuống dòng). */
    private static String jsString(String value) {
        StringBuilder sb = new StringBuilder("\"");
        for (char ch : value.toCharArray()) {
            switch (ch) {
                case '\\' -> sb.append("\\\\");
                case '"' -> sb.append("\\\"");
                case '<' -> sb.append("\\u003c");
                case '>' -> sb.append("\\u003e");
                case '&' -> sb.append("\\u0026");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                default -> sb.append(ch);
            }
        }
        return sb.append('"').toString();
    }

    private static String trimSlash(String url) {
        return url != null && url.endsWith("/") ? url.substring(0, url.length() - 1) : (url == null ? "" : url);
    }
}
