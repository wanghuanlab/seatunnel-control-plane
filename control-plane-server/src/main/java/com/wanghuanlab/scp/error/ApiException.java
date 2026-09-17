package com.wanghuanlab.scp.error;

public class ApiException extends RuntimeException {

    private final int status;
    private final Object probe;

    public ApiException(int status, String message) {
        this(status, message, null);
    }

    public ApiException(int status, String message, Object probe) {
        super(message);
        this.status = status;
        this.probe = probe;
    }

    public int getStatus() {
        return status;
    }

    public Object getProbe() {
        return probe;
    }

    public static ApiException badRequest(String message) {
        return new ApiException(400, message);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(401, message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(403, message);
    }

    public static ApiException notFound(String message) {
        return new ApiException(404, message);
    }
}
