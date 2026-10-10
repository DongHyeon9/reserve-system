package com.popspot.api.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.popspot.api.TestTokens;
import com.popspot.api.TestcontainersConfiguration;
import com.sun.net.httpserver.HttpServer;

/** Supabase-style asymmetric keys: ES256 tokens verified through a JWKS endpoint, plus the opt-in dev HS256 fallback. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class JwksAuthTests {

	static final String ISSUER = "https://example-ref.supabase.co/auth/v1";

	static final String DEV_ISSUER = "popspot-dev-test";

	static final String DEV_SECRET = "dev-only-secret-0123456789abcdef0123456789";

	static final ECKey SIGNING_KEY = generate("supabase-kid");

	static final ECKey ATTACKER_KEY = generate("supabase-kid");

	static final HttpServer JWKS = startJwks();

	@Autowired
	MockMvc mvc;

	@DynamicPropertySource
	static void auth(DynamicPropertyRegistry registry) {
		registry.add("popspot.auth.issuer", () -> ISSUER);
		registry.add("popspot.auth.jwks-uri", () -> "http://localhost:" + JWKS.getAddress().getPort() + "/jwks.json");
		registry.add("popspot.auth.jwt-secret", () -> "");
		registry.add("popspot.auth.dev-issuer", () -> DEV_ISSUER);
		registry.add("popspot.auth.dev-jwt-secret", () -> DEV_SECRET);
	}

	@AfterAll
	static void stop() {
		JWKS.stop(0);
	}

	@Test
	void acceptsEs256TokenFromJwks() throws Exception {
		UUID user = UUID.randomUUID();
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + es256(SIGNING_KEY, user, ISSUER)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(user.toString()));
	}

	@Test
	void rejectsTokenSignedByAnotherKeyWithSameKid() throws Exception {
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + es256(ATTACKER_KEY, UUID.randomUUID(), ISSUER)))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void rejectsJwksTokenWithWrongIssuer() throws Exception {
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + es256(SIGNING_KEY, UUID.randomUUID(), DEV_ISSUER)))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void devTokensVerifyOnlyWithDevSecretAndIssuer() throws Exception {
		Instant exp = Instant.now().plusSeconds(60);
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + TestTokens.sign(UUID.randomUUID(), DEV_SECRET, DEV_ISSUER, exp)))
			.andExpect(status().isOk());
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + TestTokens.sign(UUID.randomUUID(), DEV_SECRET, ISSUER, exp)))
			.andExpect(status().isUnauthorized());
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + TestTokens.sign(UUID.randomUUID(), TestTokens.SECRET, DEV_ISSUER, exp)))
			.andExpect(status().isUnauthorized());
	}

	private static String es256(ECKey key, UUID user, String issuer) throws JOSEException {
		var claims = new JWTClaimsSet.Builder().subject(user.toString())
			.issuer(issuer)
			.audience("authenticated")
			.claim("email", "es256@example.com")
			.expirationTime(Date.from(Instant.now().plusSeconds(60)))
			.build();
		var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.ES256).keyID(key.getKeyID()).build(), claims);
		jwt.sign(new ECDSASigner(key));
		return jwt.serialize();
	}

	private static ECKey generate(String kid) {
		try {
			return new ECKeyGenerator(Curve.P_256).keyID(kid).generate();
		}
		catch (JOSEException e) {
			throw new IllegalStateException(e);
		}
	}

	private static HttpServer startJwks() {
		try {
			HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
			byte[] body = new JWKSet(SIGNING_KEY.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
			server.createContext("/jwks.json", exchange -> {
				exchange.getResponseHeaders().add("Content-Type", "application/json");
				exchange.sendResponseHeaders(200, body.length);
				exchange.getResponseBody().write(body);
				exchange.close();
			});
			server.start();
			return server;
		}
		catch (IOException e) {
			throw new IllegalStateException(e);
		}
	}

}
