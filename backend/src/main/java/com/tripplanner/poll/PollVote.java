package com.tripplanner.poll;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.domain.Persistable;

/**
 * 1 phiếu = (lựa chọn, người vote). Không lưu trip_id (suy ra qua option → poll): việc "phải là thành viên"
 * do service kiểm tra; khi rời nhóm, phiếu của người đó bị xóa.
 */
@Entity
@Table(name = "poll_votes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PollVote implements Persistable<PollVoteId> {

    @Transient
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean isNew = true;

    @EmbeddedId
    private PollVoteId id;

    @Column(name = "voted_at", nullable = false, updatable = false)
    private Instant votedAt;

    public PollVote(Long optionId, Long userId) {
        this.id = new PollVoteId(optionId, userId);
    }

    @PrePersist
    void onCreate() {
        votedAt = Instant.now();
    }

    @PostPersist
    @PostLoad
    void markNotNew() {
        this.isNew = false;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }
}
