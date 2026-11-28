package com.tripplanner.notification.mail;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripplanner.config.AppProperties;
import com.tripplanner.notification.NotificationCategory;
import com.tripplanner.notification.NotificationChannel;
import com.tripplanner.notification.NotificationType;
import com.tripplanner.notification.UnsubscribeTokens;
import com.tripplanner.notification.UnsubscribeTokens.Scope;
import com.tripplanner.notification.mail.DigestItemFormatter.DigestItem;
import com.tripplanner.notification.mail.MailRenderer.FooterLink;
import com.tripplanner.notification.mail.MailRenderer.Layout;
import com.tripplanner.notification.mail.MailRenderer.Rendered;
import com.tripplanner.share.CoverImageRenderer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Dựng email hoàn chỉnh (tiêu đề, HTML, text, header List-Unsubscribe) cho từng loại thư. */
@Component
public class NotificationMailBuilder {

    public static final int VERIFY_HOURS = 24;

    private final MailRenderer renderer;
    private final UnsubscribeTokens unsubscribeTokens;
    private final ObjectMapper objectMapper;
    private final String frontendUrl;
    private final String publicBaseUrl;

    public NotificationMailBuilder(MailRenderer renderer, UnsubscribeTokens unsubscribeTokens, ObjectMapper objectMapper,
                                   AppProperties properties) {
        this.renderer = renderer;
        this.unsubscribeTokens = unsubscribeTokens;
        this.objectMapper = objectMapper;
        this.frontendUrl = stripSlash(properties.frontendUrl());
        this.publicBaseUrl = stripSlash(properties.publicBaseUrl());
    }

    /** 1 dòng thông báo trong nhóm gửi. */
    public record GroupRow(NotificationType type, String payload) {
    }

    /** Một nhóm (người nhận, chuyến, kênh) sẽ thành 1 email. {@code rows} theo thứ tự xảy ra. */
    public record GroupMail(long userId, String to, Long tripId, String tripTitle, NotificationChannel channel,
                            List<GroupRow> rows) {
    }

    public record DigestSection(String title, List<DigestItem> items) {
    }

    // ---------------------------------------------------------------- thư giao dịch (không qua outbox)

    public OutgoingEmail verifyEmail(String to, String displayName, String rawToken) {
        String link = frontendUrl + "/verify-email?token=" + rawToken;
        Rendered rendered = renderer.render("verify-email",
                Map.of("displayName", displayName, "email", to, "link", link, "hours", VERIFY_HOURS),
                new Layout("Bấm để xác minh email nhận thông báo",
                        "Bạn nhận email này vì địa chỉ này vừa được nhập trong Trip Planner.", List.of()));
        return new OutgoingEmail(to, "Xác minh email nhận thông báo – Trip Planner", rendered.html(),
                rendered.text(), Map.of());
    }

    public OutgoingEmail testEmail(long userId, String to, String displayName) {
        Rendered rendered = renderer.render("test", Map.of("displayName", displayName),
                new Layout("Email thử từ Trip Planner", null,
                        List.of(new FooterLink("Tắt mọi email", unsubscribePage(userId, Scope.all())))));
        return new OutgoingEmail(to, "Gửi thử thành công – Trip Planner", rendered.html(), rendered.text(),
                listUnsubscribe(userId, Scope.all()));
    }

    // ---------------------------------------------------------------- thư thông báo (dispatcher)

    public OutgoingEmail group(GroupMail mail) {
        if (mail.rows().isEmpty()) {
            throw new IllegalArgumentException("Nhóm gửi rỗng");
        }
        Set<NotificationCategory> categories = EnumSet.noneOf(NotificationCategory.class);
        mail.rows().forEach(row -> categories.add(row.type().category()));

        Scope headerScope = categories.size() == 1 ? Scope.category(categories.iterator().next())
                : mail.tripId() != null ? Scope.trip(mail.tripId()) : Scope.all();
        Layout layout = new Layout(null,
                mail.tripTitle() == null ? null
                        : "Bạn nhận email này vì là thành viên chuyến “" + mail.tripTitle() + "” trên Trip Planner.",
                footerLinks(mail.userId(), mail.tripId(), categories));

        Content content = mail.channel() == NotificationChannel.COUNTDOWN ? countdown(mail) : digest(mail);
        Rendered rendered = renderer.render(content.template(), content.variables(),
                new Layout(content.preheader(), layout.footerNote(), layout.links()));
        return new OutgoingEmail(mail.to(), content.subject(), rendered.html(), rendered.text(),
                listUnsubscribe(mail.userId(), headerScope));
    }

    private record Content(String template, String subject, String preheader, Map<String, Object> variables) {
    }

    private Content digest(GroupMail mail) {
        Map<String, List<DigestItem>> bySection = new LinkedHashMap<>();
        boolean hasExpense = false;
        boolean onlyRemoved = true;
        for (GroupRow row : mail.rows()) {
            NotificationCategory category = row.type().category();
            hasExpense |= category == NotificationCategory.EXPENSE;
            onlyRemoved &= row.type() == NotificationType.YOU_WERE_REMOVED;
            String section = category == NotificationCategory.EXPENSE ? "Chi tiêu" : "Thành viên";
            bySection.computeIfAbsent(section, k -> new ArrayList<>())
                    .add(DigestItemFormatter.format(row.type(), parse(row.payload())));
        }
        List<DigestSection> sections = bySection.entrySet().stream()
                .map(e -> new DigestSection(e.getKey(), List.copyOf(e.getValue())))
                .toList();

        int count = mail.rows().size();
        String title = mail.tripTitle() == null ? "Chuyến đi" : mail.tripTitle();
        GroupRow first = mail.rows().get(0);
        String summary = count == 1 ? DigestItemFormatter.singleSubject(first.type(), parse(first.payload()))
                : count + " cập nhật mới";

        Map<String, Object> vars = new HashMap<>();
        vars.put("tripTitle", title);
        vars.put("heading", count == 1 ? "Có 1 cập nhật mới" : "Có " + count + " cập nhật mới trong chuyến đi");
        vars.put("sections", sections);
        boolean button = mail.tripId() != null && !onlyRemoved;
        vars.put("buttonUrl", button ? tripUrl(mail.tripId(), hasExpense ? "expenses" : "overview") : null);
        vars.put("buttonLabel", hasExpense ? "Xem chi tiêu" : "Mở chuyến đi");
        return new Content("digest", "[" + title + "] " + summary, summary, vars);
    }

    private Content countdown(GroupMail mail) {
        // Thường chỉ 1 dòng; lỡ có nhiều (2 mốc dồn lại) thì lấy dòng mới nhất
        JsonNode p = parse(mail.rows().get(mail.rows().size() - 1).payload());
        int daysLeft = p.path("daysLeft").asInt();
        String title = mail.tripTitle() == null ? p.path("tripTitle").asText("Chuyến đi") : mail.tripTitle();
        String destination = p.hasNonNull("destination") && !p.path("destination").asText().isBlank()
                ? p.path("destination").asText() : null;
        String place = destination != null ? destination : title;
        String headline = switch (daysLeft) {
            case 0 -> "Hôm nay khởi hành: " + place + " 🎒";
            case 1 -> "Mai đi " + place + " rồi! Kiểm tra lần cuối";
            case 3 -> "Còn 3 ngày – chuẩn bị hành lý cho " + place + " nhé";
            default -> "Còn " + daysLeft + " ngày nữa là tới " + place + "!";
        };
        String dateRange = dateRange(p);

        Map<String, Object> vars = new HashMap<>();
        vars.put("tripTitle", title);
        vars.put("headline", headline);
        vars.put("daysLeft", daysLeft);
        vars.put("dateRange", dateRange);
        vars.put("destination", destination);
        vars.put("buttonUrl", mail.tripId() == null ? null : tripUrl(mail.tripId(), "itinerary"));
        vars.put("checklistUrl", mail.tripId() == null ? null : tripUrl(mail.tripId(), "checklist") + "&view=shared");
        vars.put("packingUrl", mail.tripId() == null ? null : tripUrl(mail.tripId(), "checklist") + "&view=mine");
        putCover(vars, p.path("coverImageUrl").asText(null), mail.tripId());
        putDay1(vars, p.path("day1"));
        putWeather(vars, p.path("weather"), destination);
        putChecklist(vars, p);
        return new Content("countdown", headline, dateRange, vars);
    }

    /** Mục lịch trình ngày 1 trong email. {@code time} có thể null. */
    public record ItineraryLine(String time, String title, String location) {
    }

    public record ChecklistLine(String itemName, int quantity) {
    }

    /**
     * 1 ngày trong khối "Thời tiết dự kiến": {@code summary} vd "☀️ Ngày 1 · T6 05/12 · 18–24°C · 💧 30%";
     * {@code place} chỉ có khi khác điểm đến của chuyến; {@code advice} null nếu không có gợi ý.
     */
    public record WeatherLine(String summary, String place, String advice) {
    }

    private static void putWeather(Map<String, Object> vars, JsonNode weather, String destination) {
        List<WeatherLine> lines = new ArrayList<>();
        weather.forEach(day -> {
            List<String> parts = new ArrayList<>();
            parts.add(day.path("emoji").asText("") + " Ngày " + day.path("dayIndex").asInt());
            String date = textOrNull(day, "date");
            if (date != null) {
                parts.add(MailFormat.INSTANCE.weekdayShortDate(LocalDate.parse(date)));
            }
            parts.add(day.path("label").asText(""));
            if (day.path("tempMin").isNumber() && day.path("tempMax").isNumber()) {
                parts.add(Math.round(day.path("tempMin").asDouble()) + "–" + Math.round(day.path("tempMax").asDouble())
                        + "°C");
            }
            if (day.path("precipProbability").isNumber()) {
                parts.add("💧 " + day.path("precipProbability").asInt() + "%");
            }
            String place = textOrNull(day, "placeName");
            List<String> advice = new ArrayList<>();
            day.path("advice").forEach(a -> advice.add(a.asText()));
            lines.add(new WeatherLine(String.join(" · ", parts),
                    place == null || place.equals(destination) ? null : place,
                    advice.isEmpty() ? null : String.join(" · ", advice)));
        });
        vars.put("weatherDays", lines);
    }

    /** Ảnh bìa http(s) → ảnh thật; preset → dải màu gradient như FE (CoverImageRenderer ↔ lib/covers.ts). */
    private static void putCover(Map<String, Object> vars, String cover, Long tripId) {
        boolean image = cover != null && (cover.startsWith("https://") || cover.startsWith("http://"));
        vars.put("coverImageUrl", image ? cover : null);
        List<String> colors = CoverImageRenderer.presetHexColors(image ? null : cover, tripId == null ? 0 : tripId);
        vars.put("coverColor", colors.get(0));
        vars.put("coverGradient", "linear-gradient(135deg, " + String.join(", ", colors) + ")");
    }

    private static void putDay1(Map<String, Object> vars, JsonNode day1) {
        List<ItineraryLine> items = new ArrayList<>();
        day1.path("items").forEach(item -> items.add(new ItineraryLine(textOrNull(item, "time"),
                item.path("title").asText(""), textOrNull(item, "location"))));
        List<DressColorStyles.Style> colors = new ArrayList<>();
        day1.path("dressColors").forEach(key -> colors.add(DressColorStyles.of(key.asText())));
        String theme = textOrNull(day1, "dressTheme");
        String note = textOrNull(day1, "dressNote");
        vars.put("day1Items", items);
        vars.put("day1More", day1.path("moreItems").asInt(0));
        vars.put("dressTheme", theme);
        vars.put("dressNote", note);
        vars.put("dressColors", colors);
        vars.put("hasDress", theme != null || note != null || !colors.isEmpty());
    }

    private static void putChecklist(Map<String, Object> vars, JsonNode p) {
        List<ChecklistLine> lines = new ArrayList<>();
        p.path("myChecklist").forEach(item -> lines.add(
                new ChecklistLine(item.path("itemName").asText(""), item.path("quantity").asInt(1))));
        vars.put("myChecklist", lines);
        vars.put("myChecklistMore", p.path("myChecklistMore").asInt(0));
        List<ChecklistLine> packing = new ArrayList<>();
        p.path("myPacking").forEach(item -> packing.add(
                new ChecklistLine(item.path("itemName").asText(""), item.path("quantity").asInt(1))));
        int packingMore = p.path("myPackingMore").asInt(0);
        vars.put("myPacking", packing);
        vars.put("myPackingMore", packingMore);
        vars.put("myPackingTotal", packing.size() + packingMore);
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() || value.asText().isBlank() ? null : value.asText();
    }

    // ---------------------------------------------------------------- helpers

    private List<FooterLink> footerLinks(long userId, Long tripId, Set<NotificationCategory> categories) {
        List<FooterLink> links = new ArrayList<>();
        if (categories.size() == 1) {
            links.add(new FooterLink("Tắt loại thông báo này",
                    unsubscribePage(userId, Scope.category(categories.iterator().next()))));
        }
        if (tripId != null) {
            links.add(new FooterLink("Tắt email của chuyến này", unsubscribePage(userId, Scope.trip(tripId))));
        }
        links.add(new FooterLink("Tắt mọi email", unsubscribePage(userId, Scope.all())));
        return links;
    }

    private String unsubscribePage(long userId, Scope scope) {
        return frontendUrl + "/unsubscribe?token=" + unsubscribeTokens.sign(userId, scope);
    }

    /** RFC 8058: Gmail/Outlook hiện nút "Huỷ đăng ký" và POST tới URL này. */
    private Map<String, String> listUnsubscribe(long userId, Scope scope) {
        String url = publicBaseUrl + "/api/v1/notifications/unsubscribe/one-click?token="
                + unsubscribeTokens.sign(userId, scope);
        return Map.of("List-Unsubscribe", "<" + url + ">", "List-Unsubscribe-Post", "List-Unsubscribe=One-Click");
    }

    private String tripUrl(long tripId, String tab) {
        return frontendUrl + "/trips/" + tripId + "?tab=" + tab;
    }

    private static String dateRange(JsonNode p) {
        MailFormat fmt = MailFormat.INSTANCE;
        if (!p.hasNonNull("startDate")) {
            return "";
        }
        LocalDate start = LocalDate.parse(p.path("startDate").asText());
        if (!p.hasNonNull("endDate")) {
            return fmt.date(start);
        }
        LocalDate end = LocalDate.parse(p.path("endDate").asText());
        return end.equals(start) ? fmt.date(start) : fmt.date(start) + " – " + fmt.shortDate(end);
    }

    private JsonNode parse(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Payload thông báo không phải JSON hợp lệ", e);
        }
    }

    private static String stripSlash(String url) {
        if (url == null) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
