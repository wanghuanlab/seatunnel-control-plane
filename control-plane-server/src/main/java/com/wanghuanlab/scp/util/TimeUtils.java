package com.wanghuanlab.scp.util;

import java.time.Instant;
import java.time.format.DateTimeFormatter;

public final class TimeUtils {

    private TimeUtils() {
    }

    public static Instant now() {
        return Instant.now();
    }

    public static String toIso(Instant value) {
        if (value == null) {
            return null;
        }
        return DateTimeFormatter.ISO_INSTANT.format(value);
    }
}
