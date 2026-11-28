package com.tripplanner.packing;

import static com.tripplanner.packing.PackingCategory.BEAUTY;
import static com.tripplanner.packing.PackingCategory.CLOTHES;
import static com.tripplanner.packing.PackingCategory.DOCUMENTS;
import static com.tripplanner.packing.PackingCategory.ELECTRONICS;
import static com.tripplanner.packing.PackingCategory.HEALTH;
import static com.tripplanner.packing.PackingCategory.OTHER;

import java.util.List;
import java.util.Optional;

/** Danh sách mẫu soạn sẵn (docs/sdd-packing-list.md mục 3.4). Pure, hằng số trong code. */
public final class PackingTemplates {

    public record Item(String itemName, PackingCategory category, int quantity) {
    }

    public record Template(String key, String label, List<Item> items) {
    }

    private static Item item(String name, PackingCategory category) {
        return new Item(name, category, 1);
    }

    public static final List<Template> ALL = List.of(
            new Template("ESSENTIALS", "Thiết yếu", List.of(
                    item("CCCD/hộ chiếu", DOCUMENTS),
                    item("Ví + thẻ ngân hàng", DOCUMENTS),
                    item("Tiền mặt", DOCUMENTS),
                    item("Điện thoại + sạc", ELECTRONICS),
                    item("Sạc dự phòng", ELECTRONICS),
                    item("Tai nghe", ELECTRONICS),
                    item("Chìa khóa nhà", OTHER))),
            new Template("BEAUTY", "Skincare & makeup", List.of(
                    item("Sữa rửa mặt", BEAUTY),
                    item("Tẩy trang", BEAUTY),
                    item("Toner", BEAUTY),
                    item("Kem dưỡng", BEAUTY),
                    item("Kem chống nắng", BEAUTY),
                    item("Son", BEAUTY),
                    item("Phấn/cushion", BEAUTY),
                    item("Mascara", BEAUTY),
                    item("Dầu gội + sữa tắm mini", BEAUTY),
                    item("Lược", BEAUTY),
                    item("Kẹp/dây buộc tóc", BEAUTY))),
            new Template("PHOTO", "Đồ chụp ảnh", List.of(
                    item("Váy/đồ chụp ảnh", CLOTHES),
                    item("Mũ", CLOTHES),
                    item("Kính râm", CLOTHES),
                    item("Phụ kiện (khuyên tai, vòng)", CLOTHES),
                    item("Gậy selfie/tripod", ELECTRONICS),
                    item("Thẻ nhớ", ELECTRONICS))),
            new Template("BEACH", "Đi biển", List.of(
                    item("Đồ bơi", CLOTHES),
                    item("Khăn tắm", CLOTHES),
                    item("Dép lê", CLOTHES),
                    item("Túi chống nước", OTHER),
                    item("Kem chống nắng", BEAUTY),
                    item("Áo khoác mỏng", CLOTHES))),
            new Template("COLD", "Trời lạnh", List.of(
                    item("Áo khoác ấm", CLOTHES),
                    item("Khăn quàng", CLOTHES),
                    item("Tất", CLOTHES),
                    item("Găng tay", CLOTHES),
                    item("Son dưỡng", BEAUTY),
                    item("Kem dưỡng ẩm", BEAUTY))),
            new Template("HEALTH", "Sức khỏe cá nhân", List.of(
                    item("Thuốc cá nhân", HEALTH),
                    item("Thuốc say xe", HEALTH),
                    item("Thuốc đau bụng", HEALTH),
                    item("Băng cá nhân", HEALTH),
                    item("Băng vệ sinh", HEALTH),
                    item("Khẩu trang", HEALTH))));

    private PackingTemplates() {
    }

    public static Optional<Template> find(String key) {
        return ALL.stream().filter(t -> t.key().equalsIgnoreCase(key)).findFirst();
    }
}
