package com.wanghuanlab.scp.repo;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.wanghuanlab.scp.domain.UserSession;

public interface UserSessionRepository extends JpaRepository<UserSession, String> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from UserSession s where s.expiresAt < :now")
    int deleteExpired(@Param("now") Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from UserSession s where s.user.id = :userId")
    int deleteByUserId(@Param("userId") Long userId);

    @Query("select s from UserSession s join fetch s.user u where s.id = :id and s.expiresAt >= :now and u.enabled = true")
    Optional<UserSession> findValid(@Param("id") String id, @Param("now") Instant now);
}
