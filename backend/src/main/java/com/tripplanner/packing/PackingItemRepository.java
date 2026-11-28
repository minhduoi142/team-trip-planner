package com.tripplanner.packing;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PackingItemRepository extends JpaRepository<PackingItem, Long> {

    List<PackingItem> findAllByTripIdAndUserId(Long tripId, Long userId);

    long countByTripIdAndUserId(Long tripId, Long userId);

    /** Chỉ trả món của chính chủ: món của người khác coi như không tồn tại (404, không lộ). */
    Optional<PackingItem> findByIdAndUserId(Long id, Long userId);
}
