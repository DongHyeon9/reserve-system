package com.popspot.api.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Supabase Auth token settings. Set {@code jwksUri} for asymmetric Supabase keys, or {@code jwtSecret}
 * (HS256, legacy Supabase secret or the local dev-login secret).
 */
@ConfigurationProperties("popspot.auth")
public record AuthProperties(String issuer, String jwksUri, String jwtSecret) {
}
