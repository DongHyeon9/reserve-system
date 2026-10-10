package com.popspot.api.auth;

import java.nio.charset.StandardCharsets;
import java.util.List;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;

import com.popspot.api.common.ProblemResponses;

@Configuration
@EnableConfigurationProperties(AuthProperties.class)
class SecurityConfig {

	@Bean
	SecurityFilterChain apiSecurity(HttpSecurity http, RoleJwtConverter roles) throws Exception {
		http.csrf(csrf -> csrf.disable())
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/actuator/health", "/actuator/health/**", "/v3/api-docs", "/error").permitAll()
				.requestMatchers(HttpMethod.GET, "/api/popups", "/api/popups/**").permitAll()
				.requestMatchers("/api/admin/**").hasRole("ADMIN")
				.requestMatchers("/api/ops/**").hasRole("OPS_TEST")
				.anyRequest().authenticated())
			.oauth2ResourceServer(oauth -> oauth
				.jwt(jwt -> jwt.jwtAuthenticationConverter(roles))
				.authenticationEntryPoint(ProblemResponses::unauthorized)
				.accessDeniedHandler(ProblemResponses::forbidden))
			.exceptionHandling(ex -> ex
				.authenticationEntryPoint(ProblemResponses::unauthorized)
				.accessDeniedHandler(ProblemResponses::forbidden));
		return http.build();
	}

	@Bean
	JwtDecoder jwtDecoder(AuthProperties props, Environment env) {
		if (!StringUtils.hasText(props.issuer())) {
			throw new IllegalStateException("popspot.auth.issuer is required");
		}
		NimbusJwtDecoder primary;
		if (StringUtils.hasText(props.jwksUri())) {
			primary = NimbusJwtDecoder.withJwkSetUri(props.jwksUri())
				.jwsAlgorithms(algs -> algs.addAll(List.of(SignatureAlgorithm.ES256, SignatureAlgorithm.RS256)))
				.build();
		}
		else if (props.jwtSecret() != null && props.jwtSecret().length() >= 32) {
			primary = hs256(props.jwtSecret());
		}
		else {
			throw new IllegalStateException("popspot.auth.jwks-uri or popspot.auth.jwt-secret (32+ chars) is required");
		}
		primary.setJwtValidator(validator(props.issuer()));
		if (!StringUtils.hasText(props.devJwtSecret())) {
			return primary;
		}

		if (env.acceptsProfiles(Profiles.of("prod"))) {
			throw new IllegalStateException("popspot.auth.dev-jwt-secret must not be set in the prod profile");
		}
		if (props.devJwtSecret().length() < 32 || !StringUtils.hasText(props.devIssuer())) {
			throw new IllegalStateException("popspot.auth.dev-issuer and dev-jwt-secret (32+ chars) are required together");
		}
		NimbusJwtDecoder dev = hs256(props.devJwtSecret());
		dev.setJwtValidator(validator(props.devIssuer()));
		// Local E2E fallback: a token is accepted only if it fully verifies against one of the two configurations.
		return token -> {
			try {
				return primary.decode(token);
			}
			catch (JwtException primaryFailure) {
				return dev.decode(token);
			}
		};
	}

	private static NimbusJwtDecoder hs256(String secret) {
		var key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
		return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
	}

	/** Supabase issues user tokens with aud=authenticated; anon/service tokens are rejected. */
	private static OAuth2TokenValidator<Jwt> validator(String issuer) {
		var audience = new JwtClaimValidator<List<String>>("aud", aud -> aud != null && aud.contains("authenticated"));
		return new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer), audience);
	}

}
