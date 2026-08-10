package com.nexchat.server.config;

import com.nexchat.server.repository.UserRepository;
import com.nexchat.server.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    // OncePerRequestFilter guarantees this runs exactly once per request
    // even if the request passes through multiple filters

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        // Step 1 — read the Authorization header
        // Valid requests look like: "Bearer eyJhbGci..."
        String authHeader = request.getHeader("Authorization");

        // Step 2 — if no token or wrong format, skip this filter
        // SecurityConfig will reject the request if the route is protected
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Step 3 — extract just the token part (remove "Bearer " prefix)
        String token = authHeader.substring(7);

        // Step 4 — validate the token
        // isTokenValid checks signature + expiry
        if (!jwtService.isTokenValid(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Step 5 — extract userId from inside the token
        String userId = jwtService.extractUserId(token);

        // Step 6 — load the user from database
        // and set them as the authenticated principal in Spring Security
        userRepository.findById(userId).ifPresent(user -> {
            UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(
                    user,           // the authenticated user object
                    null,           // credentials (not needed with JWT)
                    Collections.emptyList()  // authorities/roles (Phase 6)
                );
            authToken.setDetails(
                new WebAuthenticationDetailsSource().buildDetails(request)
            );

            // This line tells Spring Security:
            // "This request is authenticated — the user is logged in"
            SecurityContextHolder.getContext().setAuthentication(authToken);
        });

        // Step 7 — continue to the next filter or the controller
        filterChain.doFilter(request, response);
    }
}