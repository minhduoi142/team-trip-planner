package com.tripplanner.bank;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Danh sách ngân hàng (BIN theo NAPAS) để tạo VietQR. Cố định trong code: nhóm nhỏ, không cần gọi API ngoài.
 * Thêm ngân hàng: thêm 1 dòng (BIN 6 chữ số).
 */
public final class BankDirectory {

    public record Bank(String bin, String shortName, String name) {
    }

    public static final List<Bank> BANKS = List.of(
            new Bank("970436", "Vietcombank", "Ngân hàng TMCP Ngoại thương Việt Nam"),
            new Bank("970415", "VietinBank", "Ngân hàng TMCP Công thương Việt Nam"),
            new Bank("970418", "BIDV", "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam"),
            new Bank("970405", "Agribank", "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam"),
            new Bank("970407", "Techcombank", "Ngân hàng TMCP Kỹ thương Việt Nam"),
            new Bank("970422", "MB Bank", "Ngân hàng TMCP Quân đội"),
            new Bank("970416", "ACB", "Ngân hàng TMCP Á Châu"),
            new Bank("970432", "VPBank", "Ngân hàng TMCP Việt Nam Thịnh Vượng"),
            new Bank("970423", "TPBank", "Ngân hàng TMCP Tiên Phong"),
            new Bank("970403", "Sacombank", "Ngân hàng TMCP Sài Gòn Thương Tín"),
            new Bank("970441", "VIB", "Ngân hàng TMCP Quốc tế Việt Nam"),
            new Bank("970437", "HDBank", "Ngân hàng TMCP Phát triển TP.HCM"),
            new Bank("970443", "SHB", "Ngân hàng TMCP Sài Gòn – Hà Nội"),
            new Bank("970448", "OCB", "Ngân hàng TMCP Phương Đông"),
            new Bank("970426", "MSB", "Ngân hàng TMCP Hàng Hải Việt Nam"),
            new Bank("970440", "SeABank", "Ngân hàng TMCP Đông Nam Á"),
            new Bank("970431", "Eximbank", "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam"),
            new Bank("970449", "LPBank", "Ngân hàng TMCP Lộc Phát Việt Nam"),
            new Bank("970428", "Nam A Bank", "Ngân hàng TMCP Nam Á"),
            new Bank("970425", "ABBANK", "Ngân hàng TMCP An Bình"),
            new Bank("970409", "Bac A Bank", "Ngân hàng TMCP Bắc Á"),
            new Bank("970412", "PVcomBank", "Ngân hàng TMCP Đại Chúng Việt Nam"),
            new Bank("970419", "NCB", "Ngân hàng TMCP Quốc Dân"),
            new Bank("970427", "VietABank", "Ngân hàng TMCP Việt Á"),
            new Bank("970452", "KienlongBank", "Ngân hàng TMCP Kiên Long"),
            new Bank("546034", "CAKE", "Ngân hàng số CAKE by VPBank"));

    private static final Map<String, Bank> BY_BIN =
            BANKS.stream().collect(Collectors.toUnmodifiableMap(Bank::bin, Function.identity()));

    private BankDirectory() {
    }

    public static Optional<Bank> find(String bin) {
        return Optional.ofNullable(bin == null ? null : BY_BIN.get(bin));
    }
}
