package com.wanghuanlab.scp.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.wanghuanlab.scp.error.ApiException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("error", ex.getMessage());
        if (ex.getProbe() != null) {
            body.put("probe", ex.getProbe());
        }
        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    @ExceptionHandler(JsonProcessingException.class)
    public ResponseEntity<Map<String, Object>> handleJson(JsonProcessingException ex) {
        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("error", "Invalid JSON");
        return ResponseEntity.badRequest().body(body);
    }
}
