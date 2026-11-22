package com.tripplanner.dev;

import com.tripplanner.availability.AvailabilityStatus;
import com.tripplanner.checklist.ChecklistCategory;
import com.tripplanner.checklist.ChecklistItem;
import com.tripplanner.checklist.ChecklistRepository;
import com.tripplanner.expense.Expense;
import com.tripplanner.expense.ExpenseEnums;
import com.tripplanner.expense.ExpenseRepository;
import com.tripplanner.expense.ExpenseShare;
import com.tripplanner.expense.ExpenseShareRepository;
import com.tripplanner.expense.ExpenseSplitter;
import com.tripplanner.expense.Settlement;
import com.tripplanner.expense.SettlementRepository;
import com.tripplanner.poll.Poll;
import com.tripplanner.poll.PollOption;
import com.tripplanner.poll.PollOptionRepository;
import com.tripplanner.poll.PollRepository;
import com.tripplanner.poll.PollVote;
import com.tripplanner.poll.PollVoteRepository;
import com.tripplanner.itinerary.ItineraryCategory;
import com.tripplanner.itinerary.ItineraryItem;
import com.tripplanner.itinerary.ItineraryItemRepository;
import com.tripplanner.availability.MemberAvailability;
import com.tripplanner.availability.MemberAvailabilityRepository;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripMemberRepository;
import com.tripplanner.trip.TripRepository;
import com.tripplanner.trip.TripRole;
import com.tripplanner.tripday.TripDay;
import com.tripplanner.tripday.TripDayDressColor;
import com.tripplanner.tripday.TripDayDressColorRepository;
import com.tripplanner.tripday.TripDayRepository;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
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
    private final TripDayRepository tripDayRepository;
    private final TripDayDressColorRepository colorRepository;
    private final ItineraryItemRepository itemRepository;
    private final ChecklistRepository checklistRepository;
    private final PollRepository pollRepository;
    private final PollOptionRepository pollOptionRepository;
    private final PollVoteRepository pollVoteRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseShareRepository expenseShareRepository;
    private final SettlementRepository settlementRepository;
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
        ensureTripDays();
        seedPhuQuocItinerary();
        seedDalatChecklist();
        seedBankAccounts();
        seedDalatPoll();
        seedPhuQuocExpenses();
    }

    /** Phase 4: tài khoản nhận tiền MẪU (số tài khoản giả) để thử VietQR. */
    private void seedBankAccounts() {
        Map<String, String[]> accounts = Map.of(
                "linh", new String[] {"970436", "0011004455667", "NGUYEN THI LINH"},
                "mai", new String[] {"970422", "0909123456", "TRAN THI MAI"});
        accounts.forEach((username, acc) -> userRepository.findByUsername(username)
                .filter(u -> u.getBankBin() == null)
                .ifPresent(u -> {
                    u.setBankBin(acc[0]);
                    u.setBankAccountNo(acc[1]);
                    u.setBankAccountName(acc[2]);
                }));
    }

    /** Phase 4: 1 bình chọn đang mở cho Đà Lạt, có sẵn vài phiếu. */
    private void seedDalatPoll() {
        Trip trip = tripRepository.findByInviteCode("DALAT2027").orElse(null);
        if (trip == null || !pollRepository.findAllByTripId(trip.getId()).isEmpty()) {
            return;
        }
        Map<String, User> users = membersByUsername(trip);
        Poll poll = pollRepository.save(Poll.builder()
                .trip(trip).title("Tối ngày đầu ăn gì? 🍲").createdBy(users.get("linh")).build());
        String[][] options = {
                {"Lẩu gà lá é Tao Ngộ", "linh"}, {"Bánh căn Nhà Chung", "mai"}, {"Nướng ngói Đà Lạt", "lan"}};
        List<PollOption> saved = new ArrayList<>();
        for (String[] o : options) {
            saved.add(pollOptionRepository.save(PollOption.builder()
                    .poll(poll).name(o[0]).createdBy(users.get(o[1])).build()));
        }
        Map<String, int[]> votes = Map.of("linh", new int[] {0, 1}, "mai", new int[] {0}, "lan", new int[] {0, 2},
                "ngoc", new int[] {1});
        votes.forEach((username, idx) -> {
            User u = users.get(username);
            if (u != null) {
                for (int i : idx) {
                    pollVoteRepository.save(new PollVote(saved.get(i).getId(), u.getId()));
                }
            }
        });
        log.info("Đã tạo bình chọn mẫu cho Đà Lạt");
    }

    /** Phase 4: chi tiêu mẫu cho Phú Quốc (mai OWNER, linh, thao) + 1 thanh toán đang chờ xác nhận. */
    private void seedPhuQuocExpenses() {
        Trip trip = tripRepository.findByInviteCode("PHUQUOC27").orElse(null);
        if (trip == null || !expenseRepository.findAllByTripId(trip.getId()).isEmpty()) {
            return;
        }
        Map<String, User> u = membersByUsername(trip);
        User mai = u.get("mai");
        User linh = u.get("linh");
        User thao = u.get("thao");
        if (mai == null || linh == null || thao == null) {
            return;
        }
        LocalDate start = trip.getStartDate() != null ? trip.getStartDate() : LocalDate.now(clock);
        List<Long> all = List.of(mai.getId(), linh.getId(), thao.getId());
        expense(trip, "Vé máy bay khứ hồi", ExpenseEnums.Category.TRANSPORT, 3_600_000L, mai, start.minusDays(10),
                ExpenseSplitter.splitEqually(3_600_000L, all, mai.getId()), ExpenseEnums.SplitMode.EQUAL);
        expense(trip, "Homestay 3 đêm", ExpenseEnums.Category.STAY, 2_700_000L, linh, start.minusDays(7),
                ExpenseSplitter.splitEqually(2_700_000L, all, linh.getId()), ExpenseEnums.SplitMode.EQUAL);
        expense(trip, "Bún quậy Kiến Xây", ExpenseEnums.Category.FOOD, 240_000L, thao, start,
                ExpenseSplitter.splitEqually(240_000L, all, thao.getId()), ExpenseEnums.SplitMode.EQUAL);
        expense(trip, "Tour 3 đảo + lặn san hô", ExpenseEnums.Category.TICKET, 2_250_000L, mai, start.plusDays(1),
                ExpenseSplitter.splitEqually(2_250_000L, all, mai.getId()), ExpenseEnums.SplitMode.EQUAL);
        expense(trip, "Hải sản chợ đêm", ExpenseEnums.Category.FOOD, 1_050_000L, linh, start.plusDays(1),
                Map.of(linh.getId(), 300_000L, mai.getId(), 450_000L, thao.getId(), 300_000L),
                ExpenseEnums.SplitMode.CUSTOM);
        expense(trip, "Cafe view biển", ExpenseEnums.Category.FOOD, 165_000L, thao, start.plusDays(2),
                ExpenseSplitter.splitEqually(165_000L, List.of(linh.getId(), thao.getId()), thao.getId()),
                ExpenseEnums.SplitMode.EQUAL);
        settlementRepository.save(Settlement.builder()
                .trip(trip).fromUser(thao).toUser(mai).amount(1_000_000L)
                .status(ExpenseEnums.SettlementStatus.PENDING).build());
        log.info("Đã tạo chi tiêu mẫu cho Phú Quốc");
    }

    private void expense(Trip trip, String title, ExpenseEnums.Category category, long amount, User payer,
                         LocalDate spentOn, Map<Long, Long> shares, ExpenseEnums.SplitMode mode) {
        Expense e = expenseRepository.saveAndFlush(Expense.builder()
                .trip(trip).title(title).category(category).amount(amount).paidBy(payer)
                .splitMode(mode).spentOn(spentOn).createdBy(payer).build());
        shares.forEach((userId, share) -> expenseShareRepository.save(new ExpenseShare(e.getId(), userId, share)));
    }

    private Map<String, User> membersByUsername(Trip trip) {
        Map<String, User> users = new LinkedHashMap<>();
        memberRepository.findAllWithUserByTripId(trip.getId())
                .forEach(m -> users.put(m.getUser().getUsername(), m.getUser()));
        return users;
    }

    /** Trip seed đặt start/end trực tiếp (không qua TripDayService) → tạo "Ngày 1..N" nếu còn thiếu. */
    private void ensureTripDays() {
        tripRepository.findAll().stream().filter(Trip::isLocked).forEach(trip -> {
            if (!tripDayRepository.findAllByTripId(trip.getId()).isEmpty()) {
                return;
            }
            int length = TripDay.lockedLength(trip);
            for (int i = 1; i <= length; i++) {
                tripDayRepository.save(TripDay.builder().trip(trip).dayIndex(i).build());
            }
        });
    }

    /** Phase 3: lịch trình + dress code mẫu cho Phú Quốc (đã chốt 4 ngày). */
    private void seedPhuQuocItinerary() {
        Trip trip = tripRepository.findByInviteCode("PHUQUOC27").orElse(null);
        if (trip == null) {
            return;
        }
        List<TripDay> days = tripDayRepository.findAllByTripId(trip.getId());
        if (days.size() < 3 || itemRepository.countByDayId(days.getFirst().getId()) > 0) {
            return;
        }
        User mai = userRepository.findByUsername("mai").orElse(null);

        dress(days.get(0), "Trắng tinh khôi", "Váy/áo trắng + mũ cói, chụp ở Sunset Town", List.of("white", "beige"));
        dress(days.get(1), "Biển xanh", "Đồ bơi + áo khoác mỏng, kính râm", List.of("sky", "white", "navy"));
        dress(days.get(2), "Hồng pastel", "Đồ hồng nhẹ, đi chợ đêm và Grand World", List.of("pastel-pink", "lavender"));
        days.get(0).setNote("Ngày bay: tập trung Tân Sơn Nhất 6:30");

        item(days.get(0), "Bay TP.HCM → Phú Quốc", ItineraryCategory.TRANSPORT, "08:00", "09:00", "Sân bay Phú Quốc", 1_200_000L, 0, mai);
        item(days.get(0), "Nhận phòng homestay", ItineraryCategory.STAY, "11:00", null, "Dương Đông", null, 1, mai);
        item(days.get(0), "Bún quậy Kiến Xây", ItineraryCategory.FOOD, "12:00", "13:00", "Bún quậy Kiến Xây", 80_000L, 2, mai);
        item(days.get(0), "Hoàng hôn Sunset Town", ItineraryCategory.SIGHTSEEING, "17:00", "19:00", "Sunset Town", 0L, 3, mai);
        item(days.get(1), "Tour 3 đảo + lặn ngắm san hô", ItineraryCategory.ACTIVITY, "08:00", "15:00", "Cảng An Thới", 750_000L, 0, mai);
        item(days.get(1), "Cafe chill (giờ tự do)", ItineraryCategory.FOOD, null, null, null, 60_000L, 1, mai);
        item(days.get(1), "Hải sản chợ đêm", ItineraryCategory.FOOD, "19:00", "21:00", "Chợ đêm Phú Quốc", 300_000L, 2, mai);
        item(days.get(2), "Grand World + show Tinh hoa Việt Nam", ItineraryCategory.SIGHTSEEING, "15:00", "21:00", "Grand World", 0L, 0, mai);
        log.info("Đã tạo lịch trình + dress code mẫu cho Phú Quốc");
    }

    /** Phase 3: checklist mẫu cho Đà Lạt, một phần đã có người nhận / đã tick. */
    private void seedDalatChecklist() {
        Trip trip = tripRepository.findByInviteCode("DALAT2027").orElse(null);
        if (trip == null || checklistRepository.countByTripId(trip.getId()) > 0) {
            return;
        }
        Map<String, User> users = new LinkedHashMap<>();
        memberRepository.findAllWithUserByTripId(trip.getId())
                .forEach(m -> users.put(m.getUser().getUsername(), m.getUser()));
        Object[][] rows = {
                {ChecklistCategory.SHARED, "Loa bluetooth", 1, "mai", true},
                {ChecklistCategory.SHARED, "Bạt trải picnic", 1, "lan", false},
                {ChecklistCategory.FOOD, "Bánh tráng + đồ ăn vặt", 1, null, false},
                {ChecklistCategory.MEDICAL, "Thuốc say xe", 2, "linh", true},
                {ChecklistCategory.MEDICAL, "Băng cá nhân", 1, null, false},
                {ChecklistCategory.ELECTRONICS, "Sạc dự phòng", 2, "thao", false},
                {ChecklistCategory.PHOTO, "Chân máy (tripod)", 1, "ngoc", false},
                {ChecklistCategory.PHOTO, "Váy chụp đồi chè", 3, null, false},
                {ChecklistCategory.OTHER, "Áo khoác ấm", 5, null, false},
        };
        for (Object[] row : rows) {
            checklistRepository.save(ChecklistItem.builder()
                    .trip(trip)
                    .category((ChecklistCategory) row[0])
                    .itemName((String) row[1])
                    .quantity((Integer) row[2])
                    .assignee(row[3] == null ? null : users.get((String) row[3]))
                    .checked((Boolean) row[4])
                    .build());
        }
        log.info("Đã tạo checklist mẫu cho Đà Lạt");
    }

    private void dress(TripDay day, String theme, String note, List<String> colors) {
        day.setDressTheme(theme);
        day.setDressNote(note);
        colors.forEach(color -> colorRepository.save(new TripDayDressColor(day.getId(), color)));
    }

    private void item(TripDay day, String title, ItineraryCategory category, String start, String end,
                      String location, Long cost, int order, User createdBy) {
        itemRepository.save(ItineraryItem.builder()
                .tripDay(day).title(title).category(category)
                .startTime(start == null ? null : LocalTime.parse(start))
                .endTime(end == null ? null : LocalTime.parse(end))
                .locationName(location).estimatedCost(cost).sortOrder(order).createdBy(createdBy)
                .build());
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
