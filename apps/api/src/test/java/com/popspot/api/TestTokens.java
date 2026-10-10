package com.popspot.api;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

/** Mints HS256 tokens shaped like Supabase user tokens, signed with the test secret. */
public final class TestTokens {

	public static final String SECRET = "test-only-secret-0123456789abcdef0123456789";

	private TestTokens() {
	}

	public static String bearer(UUID user) {
		return "Bearer " + sign(user, SECRET, "popspot-test", Instant.now().plusSeconds(600));
	}

	public static String sign(UUID user, String secret, String issuer, Instant expiresAt) {
		try {
			var claims = new JWTClaimsSet.Builder().subject(user.toString())
				.issuer(issuer)
				.audience("authenticated")
				.claim("email", "user-" + user.toString().substring(0, 8) + "@example.com")
				.claim("role", "service_role")
				.issueTime(new Date())
				.expirationTime(Date.from(expiresAt))
				.build();
			var jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
			jwt.sign(new MACSigner(secret.getBytes()));
			return jwt.serialize();
		}
		catch (Exception e) {
			throw new IllegalStateException(e);
		}
	}

}
