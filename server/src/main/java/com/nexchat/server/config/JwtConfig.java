package com.nexchat.server.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "jwt")
// @ConfigurationProperties reads everything that starts with "jwt." 
// from application.properties and binds it to the fields below.
// So jwt.secret → secret field
//    jwt.expiration → expiration field
@Data
public class JwtConfig {

    // Mapped from: jwt.secret=nexchat_super_secret_key...
    // This is the key used to sign every JWT token
    private String secret;

    // Mapped from: jwt.expiration=86400000
    // 86400000 milliseconds = 24 hours
    // After this time the token expires and the user must log in again
    private long expiration;
}