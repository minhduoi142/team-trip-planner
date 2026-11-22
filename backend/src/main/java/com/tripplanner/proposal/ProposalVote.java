package com.tripplanner.proposal;

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
 * 1 tim = (đề xuất, người thả). Không lưu trip_id (suy ra qua proposal): "phải là thành viên" do service
 * kiểm tra; khi rời nhóm, tim của người đó bị xóa.
 */
@Entity
@Table(name = "proposal_votes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProposalVote implements Persistable<ProposalVoteId> {

    @Transient
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean isNew = true;

    @EmbeddedId
    private ProposalVoteId id;

    @Column(name = "voted_at", nullable = false, updatable = false)
    private Instant votedAt;

    public ProposalVote(Long proposalId, Long userId) {
        this.id = new ProposalVoteId(proposalId, userId);
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
