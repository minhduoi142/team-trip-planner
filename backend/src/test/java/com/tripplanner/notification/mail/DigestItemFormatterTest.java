package com.tripplanner.notification.mail;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripplanner.notification.NotificationType;
import org.junit.jupiter.api.Test;

class DigestItemFormatterTest {

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void settlementWordingDistinguishesFundContributions() throws Exception {
        var debt = json.readTree("""
                {"fromName":"Ngọc","toName":"Mai","amount":500000}""");
        var fund = json.readTree("""
                {"fromName":"Ngọc","toName":"Mai","amount":500000,"fund":true}""");

        assertThat(DigestItemFormatter.format(NotificationType.SETTLEMENT_PENDING, debt).toString())
                .contains("Ngọc báo đã chuyển cho bạn").doesNotContain("quỹ");
        assertThat(DigestItemFormatter.format(NotificationType.SETTLEMENT_PENDING, fund).toString())
                .contains("Ngọc báo đã nộp quỹ chung cho bạn");
        assertThat(DigestItemFormatter.format(NotificationType.SETTLEMENT_CONFIRMED, fund).toString())
                .contains("Mai đã xác nhận nhận", "tiền nộp quỹ của bạn");
        assertThat(DigestItemFormatter.format(NotificationType.SETTLEMENT_CONFIRMED, debt).toString())
                .contains("từ bạn").doesNotContain("quỹ");
    }
}
