package com.nexchat.server.controller;

import com.nexchat.server.model.User;
import com.nexchat.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;

    // GET /api/users/search?username=aarav
    // Search by exact username (for new chat)
    @GetMapping("/search")
    public ResponseEntity<?> searchByUsername(
            @RequestParam String username) {
        // Case insensitive search
        return userRepository.findAll().stream()
                .filter(u -> u.getUsername()
                        .equalsIgnoreCase(username.trim()))
                .findFirst()
                .map(u -> ResponseEntity.ok(Map.of(
                        "id", u.getId(),
                        "username", u.getUsername(),
                        "displayName", u.getDisplayName() != null
                                ? u.getDisplayName()
                                : u.getUsername(),
                        "profilePicUrl", u.getProfilePicUrl() != null
                                ? u.getProfilePicUrl()
                                : "",
                        "online", u.isOnline())))
                .orElse(ResponseEntity.notFound().build());
    }

    // GET /api/users/search-by-name?name=prabin
    // Search by display name OR username — case insensitive
    // Used for group creation and contacts
    @GetMapping("/search-by-name")
    public ResponseEntity<?> searchByName(
            @RequestParam String name,
            @AuthenticationPrincipal User currentUser) {

        String query = name.trim().toLowerCase();

        return ResponseEntity.ok(
                userRepository.findAll().stream()
                        .filter(u -> !u.getId().equals(currentUser.getId()))
                        .filter(u -> {
                            // Match display name (case insensitive)
                            boolean matchDisplay = u.getDisplayName() != null &&
                                    u.getDisplayName().toLowerCase()
                                            .contains(query);
                            // Match username (case insensitive)
                            boolean matchUsername = u.getUsername()
                                    .toLowerCase().contains(query);
                            return matchDisplay || matchUsername;
                        })
                        .limit(15)
                        .map(u -> Map.of(
                                "id", u.getId(),
                                "username", u.getUsername(),
                                "displayName", u.getDisplayName() != null
                                        ? u.getDisplayName()
                                        : u.getUsername(),
                                "online", u.isOnline()))
                        .toList());
    }

    // PUT /api/users/me/bio
    @PutMapping("/me/bio")
    public ResponseEntity<?> updateBio(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, String> body) {
        if (body.containsKey("displayName")) {
            currentUser.setDisplayName(body.get("displayName"));
        }
        userRepository.save(currentUser);
        return ResponseEntity.ok(Map.of("updated", true));
    }

    // GET /api/users/search-by-phone?phone=+919876543210
    @GetMapping("/search-by-phone")
    public ResponseEntity<?> searchByPhone(
            @RequestParam String phone) {
        return userRepository.findByPhone(phone.trim())
                .map(u -> ResponseEntity.ok(Map.of(
                        "id", u.getId(),
                        "username", u.getUsername(),
                        "displayName", u.getDisplayName() != null
                                ? u.getDisplayName()
                                : u.getUsername(),
                        "online", u.isOnline())))
                .orElse(ResponseEntity.notFound().build());
    }
}