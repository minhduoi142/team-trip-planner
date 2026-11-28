package com.tripplanner.document;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripDocumentRepository extends JpaRepository<TripDocument, Long> {

    /** Giấy tờ người dùng được thấy: SHARED + PRIVATE của chính họ. */
    @Query("""
            select d from TripDocument d left join fetch d.createdBy
            where d.tripId = :tripId
              and (d.visibility = com.tripplanner.document.DocumentEnums.Visibility.SHARED
                   or d.createdBy.id = :userId)
            """)
    List<TripDocument> findVisible(@Param("tripId") Long tripId, @Param("userId") Long userId);

    @Query("select d.fileKey from TripDocument d where d.tripId = :tripId and d.fileKey is not null")
    List<String> findFileKeysByTripId(@Param("tripId") Long tripId);

    @Query("""
            select d from TripDocument d
            where d.tripId = :tripId and d.createdBy.id = :userId
              and d.visibility = com.tripplanner.document.DocumentEnums.Visibility.PRIVATE
            """)
    List<TripDocument> findPrivateOf(@Param("tripId") Long tripId, @Param("userId") Long userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from TripDocument d where d.id in :ids")
    void deleteAllByIds(@Param("ids") List<Long> ids);
}
