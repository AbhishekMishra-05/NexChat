package com.nexchat.server.controller;

import com.nexchat.server.dto.AuthResponse;
import com.nexchat.server.dto.LoginRequest;
import com.nexchat.server.dto.RegisterRequest;
import com.nexchat.server.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
// @RestController means every method in this class
// automatically converts its return value to JSON

@RequestMapping("/api/auth")
// All routes in this class start with /api/auth

@RequiredArgsConstructor
// Lombok: generates constructor with all final fields injected

@CrossOrigin(origins = "*")
// Allows React frontend (running on a different port) to call this API
public class AuthController {

    private final AuthService authService;

    // POST /api/auth/register
    // Frontend sends: { username, email, password, displayName }
    // Returns:        { token, userId, username, displayName, profilePicUrl }
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {
        // @Valid triggers the validation annotations on RegisterRequest
        // (@NotBlank, @Email, @Size) — returns 400 if any fail
        // @RequestBody converts incoming JSON into a RegisterRequest object
        return ResponseEntity.ok(authService.register(request));
    }

    // POST /api/auth/login
    // Frontend sends: { email, password }
    // Returns:        { token, userId, username, displayName, profilePicUrl }
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}