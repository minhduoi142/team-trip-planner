package com.tripplanner.notification.mail;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripplanner.config.AppProperties;
import com.tripplanner.notification.NotificationCategory;
import com.tripplanner.notification.NotificationChannel;
import com.tripplanner.notification.NotificationType;
import com.tripplanner.notification.UnsubscribeTokens;
import com.tripplanner.notification.UnsubscribeTokens.Scope;
import com.tripplanner.notification.mail.NotificationMailBuilder.GroupMail;
import com.tripplanner.notification.mail.NotificationMailBuilder.GroupRow;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** Render template thật (Thymeleaf lõi) để bắt lỗi biểu thức trong template ngay ở unit test. */
class NotificationMailBuilderTest {

    private static final String FE = "https://trip.example.com";
    private static final String BE = "https://trip.example.com";

    private final UnsubscribeTokens tokens = new UnsubscribeTokens("test-only-secret-key-for-unit-tests-0123456789");
    private final NotificationMailBuilder builder = new NotificationMailBuilder(new MailRenderer(), tokens,
            new ObjectMapper(), new AppProperties(null, null, null, null, "Asia/Ho_Chi_Minh", null,
            FE + "/", BE, null, null));

    @Test
    void digestWithSeveralCategoriesGroupsSectionsAndUsesTripScope() {
        OutgoingEmail mail = builder.group(new GroupMail(5, "lan@example.com", 12L, "Đà Lạt mộng mơ",
                NotificationChannel.DIGEST, List.of(
                new GroupRow(NotificationType.MEMBER_JOINED, "{\"memberName\":\"Ngọc\"}"),
                new GroupRow(NotificationType.EXPENSE_ADDED, """
                        {"actorName":"Linh","expenseTitle":"Lẩu gà lá é","amount":1200000,
                         "paidByName":"Linh","yourShare":250000}"""))));

        assertThat(mail.to()).isEqualTo("lan@example.com");
        assertThat(mail.subject()).isEqualTo("[Đà Lạt mộng mơ] 2 cập nhật mới");
        assertThat(mail.html())
                .contains("Thành viên", "Chi tiêu", "Ngọc đã tham gia nhóm", "Lẩu gà lá é")
                .contains("1.200.000 ₫", "Phần của bạn 250.000 ₫")
                .contains(FE + "/trips/12?tab=expenses")
                .contains("Tắt email của chuyến này", "Tắt mọi email")
                .doesNotContain("Tắt loại thông báo này");
        assertThat(mail.text()).contains("Ngọc đã tham gia nhóm", "Phần của bạn 250.000 ₫", "Tắt mọi email: " + FE);

        assertThat(mail.headers()).containsEntry("List-Unsubscribe-Post", "List-Unsubscribe=One-Click");
        String header = mail.headers().get("List-Unsubscribe");
        assertThat(header).startsWith("<" + BE + "/api/v1/notifications/unsubscribe/one-click?token=");
        assertThat(tokens.verify(tokenIn(header))).hasValueSatisfying(claims -> {
            assertThat(claims.userId()).isEqualTo(5);
            assertThat(claims.scope()).isEqualTo(Scope.trip(12));
        });
    }

    @Test
    void singleExpenseHasSpecificSubjectAndCategoryUnsubscribe() {
        OutgoingEmail mail = builder.group(new GroupMail(5, "lan@example.com", 12L, "Đà Lạt",
                NotificationChannel.DIGEST, List.of(new GroupRow(NotificationType.EXPENSE_ADDED, """
                        {"actorName":"Linh","expenseTitle":"Taxi","amount":300000,"paidByName":"Linh","yourShare":100000}
                        """))));

        assertThat(mail.subject()).isEqualTo("[Đà Lạt] Linh đã thêm khoản chi “Taxi” – phần của bạn 100.000 ₫");
        assertThat(mail.html()).contains("Tắt loại thông báo này");
        assertThat(tokens.verify(tokenIn(mail.headers().get("List-Unsubscribe"))))
                .hasValueSatisfying(c -> assertThat(c.scope()).isEqualTo(Scope.category(NotificationCategory.EXPENSE)));
    }

    @Test
    void userContentIsHtmlEscaped() {
        OutgoingEmail mail = builder.group(new GroupMail(5, "lan@example.com", 12L, "<script>x</script>",
                NotificationChannel.DIGEST,
                List.of(new GroupRow(NotificationType.MEMBER_JOINED, "{\"memberName\":\"<b>Vy</b>\"}"))));

        assertThat(mail.html()).doesNotContain("<b>Vy</b>", "<script>x</script>").contains("&lt;b&gt;Vy&lt;/b&gt;");
    }

    @Test
    void removedOnlyDigestHasNoTripButton() {
        OutgoingEmail mail = builder.group(new GroupMail(5, "vy@example.com", 12L, "Đà Lạt",
                NotificationChannel.DIGEST,
                List.of(new GroupRow(NotificationType.YOU_WERE_REMOVED, "{\"removedByName\":\"Linh\"}"))));

        assertThat(mail.subject()).isEqualTo("[Đà Lạt] Bạn không còn ở trong chuyến này");
        assertThat(mail.html()).contains("Do Linh mời ra khỏi nhóm").doesNotContain("/trips/12?tab=");
    }

    @Test
    void countdownUsesMilestoneHeadlineAndDates() {
        OutgoingEmail mail = builder.group(new GroupMail(5, "lan@example.com", 3L, "Phú Quốc 2026",
                NotificationChannel.COUNTDOWN, List.of(new GroupRow(NotificationType.COUNTDOWN, """
                        {"tripTitle":"Phú Quốc 2026","destination":"Phú Quốc","daysLeft":1,
                         "startDate":"2026-12-05","endDate":"2026-12-08"}"""))));

        assertThat(mail.subject()).isEqualTo("Mai đi Phú Quốc rồi! Kiểm tra lần cuối");
        assertThat(mail.html()).contains("Thứ Bảy, 05/12/2026 – 08/12/2026", FE + "/trips/3?tab=itinerary");
        assertThat(mail.text()).contains("Mai đi Phú Quốc rồi!", "Điểm đến: Phú Quốc");
        // Không có ảnh bìa → dải màu preset (theo trip id như FE)
        assertThat(mail.html()).contains("linear-gradient(135deg, #");
    }

    @Test
    void countdownShowsDay1DressCodeAndMyChecklist() {
        OutgoingEmail mail = builder.group(new GroupMail(5, "lan@example.com", 3L, "Phú Quốc 2026",
                NotificationChannel.COUNTDOWN, List.of(new GroupRow(NotificationType.COUNTDOWN, """
                        {"tripTitle":"Phú Quốc 2026","destination":"Phú Quốc","daysLeft":3,
                         "startDate":"2026-12-05","endDate":"2026-12-08","coverImageUrl":"https://img.example/c.jpg",
                         "day1":{"items":[{"time":"07:30","title":"Bay VJ321","location":"Tân Sơn Nhất"},
                                          {"time":null,"title":"Nhận phòng","location":null}],
                                 "moreItems":2,"dressTheme":"Biển xanh","dressNote":null,
                                 "dressColors":["navy","white"]},
                         "myChecklist":[{"itemName":"Kem chống nắng","quantity":2}],"myChecklistMore":3}"""))));

        assertThat(mail.subject()).isEqualTo("Còn 3 ngày – chuẩn bị hành lý cho Phú Quốc nhé");
        assertThat(mail.html())
                .contains("https://img.example/c.jpg")
                .contains("Ngày 1", "07:30", "Bay VJ321", "Tân Sơn Nhất", "Nhận phòng", "và 2 hoạt động khác")
                .contains("Dress code ngày 1", "Biển xanh", "Xanh navy", "#1e3a8a", "Trắng")
                .contains("Bạn nhận mang", "Kem chống nắng", " × 2", "và 3 món khác", FE + "/trips/3?tab=checklist");
        assertThat(mail.text())
                .contains("NGÀY 1", "- 07:30 Bay VJ321 (Tân Sơn Nhất)", "- Nhận phòng")
                .contains("Màu: Xanh navy, Trắng", "- Kem chống nắng × 2");
    }

    @Test
    void countdownWithoutDay1OrChecklistHidesThoseBlocks() {
        OutgoingEmail mail = builder.group(new GroupMail(5, "lan@example.com", 3L, "Đà Lạt",
                NotificationChannel.COUNTDOWN, List.of(new GroupRow(NotificationType.COUNTDOWN, """
                        {"tripTitle":"Đà Lạt","daysLeft":0,"startDate":"2026-11-24","endDate":"2026-11-26",
                         "coverImageUrl":"preset:ocean","day1":null,"myChecklist":[],"myChecklistMore":0}"""))));

        assertThat(mail.subject()).isEqualTo("Hôm nay khởi hành: Đà Lạt 🎒");
        assertThat(mail.html()).contains("#7dd3fc").doesNotContain("Ngày 1", "Dress code", "Bạn nhận mang");
    }

    @Test
    void verificationMailCarriesFrontendLink() {
        OutgoingEmail mail = builder.verifyEmail("lan@example.com", "Lan", "tok_123");

        assertThat(mail.subject()).contains("Xác minh email");
        assertThat(mail.html()).contains(FE + "/verify-email?token=tok_123", "lan@example.com", "24");
        assertThat(mail.text()).contains(FE + "/verify-email?token=tok_123");
        assertThat(mail.headers()).isEmpty();
    }

    @Test
    void testMailOffersUnsubscribeAll() {
        OutgoingEmail mail = builder.testEmail(5, "lan@example.com", "Lan");

        assertThat(mail.html()).contains("Gửi thử thành công", "Tắt mọi email");
        assertThat(tokens.verify(tokenIn(mail.headers().get("List-Unsubscribe"))))
                .hasValueSatisfying(c -> assertThat(c.scope()).isEqualTo(Scope.all()));
    }

    private static String tokenIn(String listUnsubscribeHeader) {
        Matcher m = Pattern.compile("token=([^>]+)>").matcher(listUnsubscribeHeader);
        assertThat(m.find()).isTrue();
        return m.group(1);
    }
}
