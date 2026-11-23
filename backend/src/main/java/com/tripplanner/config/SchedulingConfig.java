package com.tripplanner.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Bật @Scheduled (dọn họ refresh token cũ mỗi đêm). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
