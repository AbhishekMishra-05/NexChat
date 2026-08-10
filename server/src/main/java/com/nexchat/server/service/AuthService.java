package com.nexchat.server.service;

import com.nexchat.server.dto.AuthResponse;
import com.nexchat.server.dto.LoginRequest;
import com.nexchat.server.dto.RegisterRequest;
import com.nexchat.server.model.User;
import com.nexchat.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already taken");
        }
        if (request.getPhone() != null &&
            !request.getPhone().isBlank() &&
            userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Phone number already registered");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .phone(request.getPhone() != null &&
                       !request.getPhone().isBlank()
                       ? request.getPhone() : null)
                .password(passwordEncoder.encode(request.getPassword()))
                .displayName(
                    request.getDisplayName() != null &&
                    !request.getDisplayName().isBlank()
                    ? request.getDisplayName()
                    : request.getUsername()
                )
                .build();

        userRepository.save(user);
        String token = jwtService.generateToken(user);
        return new AuthResponse(token, user.getId(),
            user.getUsername(), user.getDisplayName(),
            user.getProfilePicUrl());
    }

    public AuthResponse login(LoginRequest request) {
        String identifier = request.getEmailOrPhone().trim();

        // Try email first, then phone number
        User user = null;

        if (identifier.contains("@")) {
            // Looks like an email
            user = userRepository.findByEmail(identifier)
                .orElse(null);
        } else {
            // Try phone number
            user = userRepository.findByPhone(identifier)
                .orElse(null);
        }

        // If still not found try both
        if (user == null) {
            user = userRepository.findByEmail(identifier)
                .orElse(null);
        }
        if (user == null) {
            user = userRepository.findByPhone(identifier)
                .orElse(null);
        }
        if (user == null) {
            throw new RuntimeException("Invalid credentials");
        }

        if (!passwordEncoder.matches(
                request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, user.getId(),
            user.getUsername(), user.getDisplayName(),
            user.getProfilePicUrl());
    }
}