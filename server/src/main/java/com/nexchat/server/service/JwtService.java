package com.nexchat.server.service;

import com.nexchat.server.config.JwtConfig;
import com.nexchat.server.model.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtConfig jwtConfig;

    // Converts the plain-text secret string from application.properties
    // into a cryptographic Key object that the JWT library can use
    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtConfig.getSecret().getBytes());
    }

    // Called after a successful login or register
    // Builds a signed JWT token containing:
    // - the user's ID (subject)
    // - their email and username (extra claims)
    // - when it was created (issuedAt)
    // - when it expires (expiration)
    // Then signs it with our secret key
    public String generateToken(User user) {
        return Jwts.builder()
                .setSubject(user.getId())
                .claim("email", user.getEmail())
                .claim("username", user.getUsername())
                .setIssuedAt(new Date())
                .setExpiration(new Date(
                    System.currentTimeMillis() + jwtConfig.getExpiration()
                ))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // Reads the userId out of a token
    // Called by JwtAuthFilter on every incoming request
    public String extractUserId(String token) {
        return parseClaims(token).getSubject();
    }

    // Returns true if:
    // 1. The token signature is valid (not tampered with)
    // 2. The token has not expired
    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // Internal helper — parses the token and returns its contents
    // Throws an exception if the token is invalid or expired
    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}