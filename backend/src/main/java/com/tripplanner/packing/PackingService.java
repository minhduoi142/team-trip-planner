package com.tripplanner.packing;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.packing.dto.PackingDtos.PackingItemRequest;
import com.tripplanner.packing.dto.PackingDtos.PackingItemResponse;
import com.tripplanner.packing.dto.PackingDtos.PackingListResponse;
import com.tripplanner.packing.dto.PackingDtos.PackingTemplateResponse;
import com.tripplanner.packing.dto.PackingDtos.TemplateItemResponse;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripRole;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hành lý cá nhân (docs/sdd-packing-list.md). Riêng tư: mọi thao tác chỉ chạm tới món của chính người gọi; món của
 * người khác trả 404 (không 403) để không lộ là có tồn tại. Mọi thao tác ghi trả lại toàn bộ danh sách.
 */
@Service
@RequiredArgsConstructor
public class PackingService {

    static final int MAX_ITEMS = 200;

    private static final Comparator<PackingItem> ORDER = Comparator
            .comparing(PackingItem::getCategory)
            .thenComparing(PackingItem::getCreatedAt)
            .thenComparing(PackingItem::getId);

    private final TripAccessService accessService;
    private final PackingItemRepository repository;

    @Transactional(readOnly = true)
    public PackingListResponse list(Long tripId, Long userId) {
        accessService.require(tripId, userId, TripRole.VIEWER);
        return build(tripId, userId, 0);
    }

    @Transactional
    public PackingListResponse add(Long tripId, Long userId, PackingItemRequest request) {
        accessService.require(tripId, userId, TripRole.VIEWER);
        if (repository.countByTripIdAndUserId(tripId, userId) >= MAX_ITEMS) {
            throw new BusinessException(ErrorCode.PACKING_LIMIT_REACHED);
        }
        repository.saveAndFlush(PackingItem.builder()
                .tripId(tripId)
                .userId(userId)
                .itemName(request.itemName().trim())
                .category(request.category())
                .quantity(request.quantity() == null ? 1 : request.quantity())
                .build());
        return build(tripId, userId, 0);
    }

    /** Thêm cả danh sách mẫu, bỏ món trùng tên (so theo {@link PackingNames#key}). Vượt giới hạn → không thêm gì. */
    @Transactional
    public PackingListResponse addTemplate(Long tripId, Long userId, String templateKey) {
        accessService.require(tripId, userId, TripRole.VIEWER);
        PackingTemplates.Template template = PackingTemplates.find(templateKey)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không có danh sách mẫu này"));
        List<PackingItem> existing = repository.findAllByTripIdAndUserId(tripId, userId);
        Set<String> names = new HashSet<>();
        existing.forEach(i -> names.add(PackingNames.key(i.getItemName())));
        List<PackingTemplates.Item> toAdd = template.items().stream()
                .filter(i -> names.add(PackingNames.key(i.itemName())))
                .toList();
        if (existing.size() + toAdd.size() > MAX_ITEMS) {
            throw new BusinessException(ErrorCode.PACKING_LIMIT_REACHED);
        }
        repository.saveAllAndFlush(toAdd.stream()
                .map(i -> PackingItem.builder()
                        .tripId(tripId)
                        .userId(userId)
                        .itemName(i.itemName())
                        .category(i.category())
                        .quantity(i.quantity())
                        .build())
                .toList());
        return build(tripId, userId, toAdd.size());
    }

    @Transactional
    public PackingListResponse update(Long itemId, Long userId, PackingItemRequest request) {
        PackingItem item = requireMine(itemId, userId);
        item.setItemName(request.itemName().trim());
        item.setCategory(request.category());
        item.setQuantity(request.quantity() == null ? 1 : request.quantity());
        repository.flush();
        return build(item.getTripId(), userId, 0);
    }

    @Transactional
    public PackingListResponse setPacked(Long itemId, Long userId, boolean packed) {
        PackingItem item = requireMine(itemId, userId);
        item.setPacked(packed);
        repository.flush();
        return build(item.getTripId(), userId, 0);
    }

    @Transactional
    public PackingListResponse delete(Long itemId, Long userId) {
        PackingItem item = requireMine(itemId, userId);
        repository.delete(item);
        repository.flush();
        return build(item.getTripId(), userId, 0);
    }

    public List<PackingTemplateResponse> templates() {
        return PackingTemplates.ALL.stream()
                .map(t -> new PackingTemplateResponse(t.key(), t.label(), t.items().stream()
                        .map(i -> new TemplateItemResponse(i.itemName(), i.category(), i.quantity()))
                        .toList()))
                .toList();
    }

    // ---------------------------------------------------------------- helpers

    /**
     * Món phải của chính người gọi và người gọi vẫn là thành viên chuyến đó. Món của người khác → 404 như không có
     * (riêng tư). Người đã rời nhóm thì món đã bị CASCADE xóa, nên cũng 404.
     */
    private PackingItem requireMine(Long itemId, Long userId) {
        PackingItem item = repository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PACKING_ITEM_NOT_FOUND));
        accessService.require(item.getTripId(), userId, TripRole.VIEWER);
        return item;
    }

    private PackingListResponse build(Long tripId, Long userId, int addedCount) {
        List<PackingItemResponse> items = repository.findAllByTripIdAndUserId(tripId, userId).stream()
                .sorted(ORDER)
                .map(i -> new PackingItemResponse(i.getId(), i.getItemName(), i.getCategory(), i.getQuantity(),
                        i.isPacked(), i.getCreatedAt()))
                .toList();
        int packed = (int) items.stream().filter(PackingItemResponse::packed).count();
        return new PackingListResponse(items, items.size(), packed, addedCount);
    }
}
