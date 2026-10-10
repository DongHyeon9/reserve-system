package com.popspot.api.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Supabase Auth token settings. Set {@code jwksUri} for asymmetric Supabase keys (ES256/RS256), or {@code jwtSecret}
 * for a legacy HS256 project secret. {@code devIssuer}/{@code devJwtSecret} additionally accept HS256 tokens minted by
 * the local E2E dev login; they are refused under the {@code prod} profile.
 */
@ConfigurationProperties("popspot.auth")
public record AuthProperties(String issuer, String jwksUri, String jwtSecret, String devIssuer, String devJwtSecret) {
}
