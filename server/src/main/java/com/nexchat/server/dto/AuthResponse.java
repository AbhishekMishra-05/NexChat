package com.nexchat.server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {

    // The JWT token — React stores this and sends it with every request
    private String token;

    // User info — React uses this to show the logged-in user's name/avatar
    private String userId;
    private String username;
    private String displayName;
    private String profilePicUrl;
}