package com.tripplanner.dev;

import com.tripplanner.availability.AvailabilityStatus;
import com.tripplanner.availability.MemberAvailability;
import com.tripplanner.availability.MemberAvailabilityRepository;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripMemberRepository;
import com.tripplanner.trip.TripRepository;
import com.tripplanner.trip.TripRole;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dữ liệu mẫu để test local. CHỈ chạy khi {@code app.seed.enabled=true} (biến APP_SEED_ENABLED),
 * tuyệt đối không bật trên production. Idempotent: đã có user "linh" thì bỏ qua.
 * Ngày của chuyến đi tính tương đối theo hôm nay để luôn đủ 4 trạng thái.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true")
public class DevDataSeeder implements ApplicationRunner {

    static final String PASSWORD = "matkhau123";

    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    private final TripMemberRepository memberRepository;
    private final MemberAvailabilityRepository availabilityRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsername("linh")) {
            log.info("Seed tài khoản/chuyến đi đã có sẵn, bỏ qua");
        } else {
            seedUsersAndTrips();
        }
        seedDalatAvailability();
    }

    /**
     * Phase 2: lịch rảnh mẫu cho Đà Lạt (11 ngày đầu của khoảng dự kiến), có 1 khoảng 3 ngày đẹp nhất
     * rõ ràng (offset 5–7). Chạy riêng để DB đã seed từ Phase 1 cũng có dữ liệu. A=rảnh M=có thể B=bận .=chưa khai
     */
    private void seedDalatAvailability() {
        Trip dalat = tripRepository.findByInviteCode("DALAT2027").orElse(null);
        if (dalat == null || !dalat.hasPlannedRange() || dalat.isLocked()
                || availabilityRepository.countByIdTripId(dalat.getId()) > 0) {
            return;
        }
        Map<String, String> patterns = Map.of(
                "linh", "BAAAAAAAABB",
                "mai", "AAAABAAAAAM",
                "lan", "MAAAMAAAABB",
                "ngoc", "BMMMAAAAA..",
                "thao", "..BAAAMAA..");
        LocalDate start = dalat.getPlannedStartDate();
        long rangeDays = ChronoUnit.DAYS.between(start, dalat.getPlannedEndDate()) + 1;
        patterns.forEach((username, pattern) -> userRepository.findByUsername(username)
                .filter(user -> memberRepository.findMember(dalat.getId(), user.getId()).isPresent())
                .ifPresent(user -> {
                    for (int i = 0; i < Math.min(pattern.length(), rangeDays); i++) {
                        AvailabilityStatus status = switch (pattern.charAt(i)) {
                            case 'A' -> AvailabilityStatus.AVAILABLE;
                            case 'M' -> AvailabilityStatus.MAYBE;
                            case 'B' -> AvailabilityStatus.BUSY;
                            default -> null;
                        };
                        if (status != null) {
                            availabilityRepository.save(new MemberAvailability(
                                    dalat.getId(), user.getId(), start.plusDays(i), status));
                        }
                    }
                }));
        log.info("Đã tạo lịch rảnh mẫu cho Đà Lạt (khoảng đẹp nhất: {} → {})",
                start.plusDays(5), start.plusDays(7));
    }

    private void seedUsersAndTrips() {

        String hash = passwordEncoder.encode(PASSWORD);
        Map<String, User> u = new LinkedHashMap<>();
        for (String[] row : new String[][] {
                {"linh", "Linh"}, {"mai", "Mai"}, {"lan", "Lan Anh"},
                {"ngoc", "Ngọc"}, {"thao", "Thảo"}, {"vy", "Vy"}}) {
            u.put(row[0], userRepository.save(User.builder()
                    .username(row[0]).passwordHash(hash).displayName(row[1]).build()));
        }

        LocalDate today = LocalDate.now(clock);

        // Đang chốt lịch: chỉ có khoảng ngày dự kiến
        Trip dalat = trip("Đà Lạt săn mây ☁️", "Đà Lạt", "Săn mây, cafe view đồi, chụp ảnh áo len.",
                "preset:lavender", "DALAT2027", u.get("linh"));
        dalat.setPlannedStartDate(today.plusDays(40));
        dalat.setPlannedEndDate(today.plusDays(50));
        save(dalat, u.get("linh"), TripRole.OWNER,
                u.get("mai"), TripRole.EDITOR, u.get("lan"), TripRole.EDITOR,
                u.get("ngoc"), TripRole.VIEWER, u.get("thao"), TripRole.EDITOR);

        // Sắp khởi hành: đã chốt ngày
        Trip phuquoc = trip("Phú Quốc nắng vàng", "Phú Quốc", "Biển, hoàng hôn Sunset Town, lặn ngắm san hô.",
                "preset:ocean", "PHUQUOC27", u.get("mai"));
        phuquoc.setStartDate(today.plusDays(12));
        phuquoc.setEndDate(today.plusDays(15));
        save(phuquoc, u.get("mai"), TripRole.OWNER,
                u.get("linh"), TripRole.EDITOR, u.get("thao"), TripRole.VIEWER);

        // Đang đi
        Trip sapa = trip("Sa Pa mùa lúa", "Sa Pa", null, "preset:mountain", "SAPANOW", u.get("lan"));
        sapa.setStartDate(today.minusDays(1));
        sapa.setEndDate(today.plusDays(1));
        save(sapa, u.get("lan"), TripRole.OWNER, u.get("linh"), TripRole.EDITOR, u.get("ngoc"), TripRole.EDITOR);

        // Đã hoàn thành
        Trip hoian = trip("Hội An đèn lồng", "Hội An", "Phố cổ, thả đèn hoa đăng, áo dài.",
                "preset:sunset", "HOIAN2026", u.get("linh"));
        hoian.setStartDate(today.minusDays(60));
        hoian.setEndDate(today.minusDays(58));
        save(hoian, u.get("linh"), TripRole.OWNER, u.get("mai"), TripRole.EDITOR, u.get("lan"), TripRole.EDITOR);

        log.info("""
                Đã tạo seed data. Mật khẩu chung: {}
                  linh  – OWNER Đà Lạt, Hội An; EDITOR Phú Quốc, Sa Pa
                  mai   – OWNER Phú Quốc; EDITOR Đà Lạt, Hội An
                  lan   – OWNER Sa Pa; EDITOR Đà Lạt, Hội An
                  ngoc  – VIEWER Đà Lạt; EDITOR Sa Pa
                  thao  – EDITOR Đà Lạt; VIEWER Phú Quốc
                  vy    – chưa có chuyến nào (test join bằng mã DALAT2027 / PHUQUOC27)""", PASSWORD);
    }

    private Trip trip(String title, String destination, String description, String cover, String code, User owner) {
        return Trip.builder()
                .title(title).destination(destination).description(description)
                .coverImageUrl(cover).inviteCode(code).createdBy(owner)
                .build();
    }

    /** Lưu trip, sau đó các cặp (user, role) theo thứ tự tham gia. */
    private void save(Trip trip, Object... membersAndRoles) {
        tripRepository.save(trip);
        for (int i = 0; i < membersAndRoles.length; i += 2) {
            memberRepository.save(new TripMember(trip, (User) membersAndRoles[i], (TripRole) membersAndRoles[i + 1]));
        }
    }
}
