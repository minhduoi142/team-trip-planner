package com.tripplanner.album;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AlbumPhotoDayRepository extends JpaRepository<AlbumPhotoDay, Long> {

    @Query("select d from AlbumPhotoDay d join fetch d.tripDay where d.photoId in :photoIds")
    List<AlbumPhotoDay> findAllByPhotoIds(@Param("photoIds") Collection<Long> photoIds);
}
