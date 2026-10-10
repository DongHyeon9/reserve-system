package com.popspot.api.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class JwtDecoderConfigTests {

	static final String SECRET = "0123456789abcdef0123456789abcdef";

	@Test
	void devSecretIsRefusedUnderProdProfile() {
		var env = new MockEnvironment();
		env.setActiveProfiles("prod");
		var props = new AuthProperties("https://x.supabase.co/auth/v1", "https://x.supabase.co/auth/v1/.well-known/jwks.json", null, "popspot-dev", SECRET);
		assertThatThrownBy(() -> new SecurityConfig().jwtDecoder(props, env)).hasMessageContaining("prod");
	}

	@Test
	void missingVerificationKeyFailsFast() {
		var props = new AuthProperties("https://x.supabase.co/auth/v1", null, null, null, null);
		assertThatThrownBy(() -> new SecurityConfig().jwtDecoder(props, new MockEnvironment())).hasMessageContaining("required");
	}

}
