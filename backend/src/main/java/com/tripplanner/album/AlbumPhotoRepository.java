package com.tripplanner.album;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AlbumPhotoRepository extends JpaRepository<AlbumPhoto, Long> {

    @Query("""
            select p from AlbumPhoto p left join fetch p.addedBy
            where p.trip.id = :tripId order by p.createdAt desc, p.id desc
            """)
    List<AlbumPhoto> findAllByTripId(@Param("tripId") Long tripId);

    @Query("select p.driveFileId from AlbumPhoto p where p.trip.id = :tripId")
    Set<String> findFileIdsByTripId(@Param("tripId") Long tripId);

    @Query("select p.trip.id from AlbumPhoto p where p.id = :photoId")
    Optional<Long> findTripIdByPhotoId(@Param("photoId") Long photoId);
}
