package com.wanghuanlab.scp.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.wanghuanlab.scp.domain.AppSetting;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {
}
