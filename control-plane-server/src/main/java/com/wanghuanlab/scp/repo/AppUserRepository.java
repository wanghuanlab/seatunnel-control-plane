package com.wanghuanlab.scp.repo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.wanghuanlab.scp.domain.AppUser;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByUsername(String username);

    long countByRoleAndEnabledTrue(String role);

    long countByRoleAndEnabledTrueAndIdNot(String role, Long id);
}
