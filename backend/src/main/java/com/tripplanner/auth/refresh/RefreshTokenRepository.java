package com.tripplanner.auth.refresh;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    @Query("select t.family.id from RefreshToken t where t.tokenHash = :hash")
    Optional<Long> findFamilyIdByHash(@Param("hash") String hash);

    @Query("select t from RefreshToken t where t.tokenHash = :hash")
    Optional<RefreshToken> findByHash(@Param("hash") String hash);
}
