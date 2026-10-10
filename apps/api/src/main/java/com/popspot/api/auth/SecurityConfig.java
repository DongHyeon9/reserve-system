package com.popspot.api.auth;

import java.nio.charset.StandardCharsets;
import java.util.List;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
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
	JwtDecoder jwtDecoder(AuthProperties props) {
		if (!StringUtils.hasText(props.issuer())) {
			throw new IllegalStateException("popspot.auth.issuer is required");
		}
		NimbusJwtDecoder decoder;
		if (StringUtils.hasText(props.jwksUri())) {
			decoder = NimbusJwtDecoder.withJwkSetUri(props.jwksUri())
				.jwsAlgorithms(algs -> algs.addAll(List.of(SignatureAlgorithm.ES256, SignatureAlgorithm.RS256)))
				.build();
		}
		else if (props.jwtSecret() != null && props.jwtSecret().length() >= 32) {
			var key = new SecretKeySpec(props.jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
			decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
		}
		else {
			throw new IllegalStateException("popspot.auth.jwks-uri or popspot.auth.jwt-secret (32+ chars) is required");
		}
		// Supabase issues user tokens with aud=authenticated; anon/service tokens are rejected.
		var audience = new JwtClaimValidator<List<String>>("aud", aud -> aud != null && aud.contains("authenticated"));
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(props.issuer()), audience));
		return decoder;
	}

}
