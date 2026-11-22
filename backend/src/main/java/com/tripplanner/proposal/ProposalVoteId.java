package com.tripplanner.proposal;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ProposalVoteId implements Serializable {

    @Column(name = "proposal_id")
    private Long proposalId;

    @Column(name = "user_id")
    private Long userId;
}
