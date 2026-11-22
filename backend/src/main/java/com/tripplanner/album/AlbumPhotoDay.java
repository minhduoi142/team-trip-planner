package com.tripplanner.album;

import com.tripplanner.tripday.TripDay;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Gắn 1 ảnh với 1 ngày đi (tùy chọn). Bảng riêng để album_photos không chứa trip_day_id
 * (trip_day_id → trip_id là phụ thuộc bắc cầu). "Ngày thuộc cùng chuyến" do service kiểm tra.
 */
@Entity
@Table(name = "album_photo_days")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AlbumPhotoDay {

    @Id
    private Long photoId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "photo_id")
    private AlbumPhoto photo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_day_id", nullable = false)
    private TripDay tripDay;

    public AlbumPhotoDay(AlbumPhoto photo, TripDay tripDay) {
        this.photo = photo;
        this.tripDay = tripDay;
    }
}
