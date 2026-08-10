package com.nexchat.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.nexchat.server.model.User;

import java.util.Map;

@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CallController {

    // POST /api/calls/log
    // Called when a call ends to record it in history
    @PostMapping("/log")
    public ResponseEntity<?> logCall(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, Object> callData) {

        // For now just acknowledge — full call log model in Phase 6
        return ResponseEntity.ok(Map.of(
            "status", "logged",
            "callerId", currentUser.getId()
        ));
    }
}