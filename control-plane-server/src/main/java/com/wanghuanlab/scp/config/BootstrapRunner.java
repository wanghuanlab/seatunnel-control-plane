package com.wanghuanlab.scp.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.wanghuanlab.scp.service.AuthService;
import com.wanghuanlab.scp.service.SchedulerService;
import com.wanghuanlab.scp.service.SettingsService;

@Component
public class BootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapRunner.class);

    private final AuthService authService;
    private final SettingsService settingsService;
    private final SchedulerService schedulerService;

    public BootstrapRunner(AuthService authService,
                           SettingsService settingsService,
                           SchedulerService schedulerService) {
        this.authService = authService;
        this.settingsService = settingsService;
        this.schedulerService = schedulerService;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean seeded = authService.seedDefaultAdmin();
        if (seeded) {
            log.info("Default admin user created: admin / 123456");
        }
        String base = settingsService.getSeatunnelBase();
        if (base == null) {
            log.warn("SeaTunnel API Base 未配置，请登录后在「系统设置」中填写");
        } else {
            log.info("SeaTunnel API Base: {}", base);
        }
        schedulerService.reloadScheduler();
        log.info("Task API: /api/tasks/*");
        log.info("Auth API: /api/auth/*");
    }
}
