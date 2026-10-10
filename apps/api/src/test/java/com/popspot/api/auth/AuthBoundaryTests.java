package com.popspot.api.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;

import com.popspot.api.TestTokens;
import com.popspot.api.TestcontainersConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthBoundaryTests {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	@Test
	void missingTokenIs401() throws Exception {
		mvc.perform(get("/api/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void forgedTokenIs401() throws Exception {
		String forged = TestTokens.sign(UUID.randomUUID(), "attacker-secret-0123456789abcdef0123456789", "popspot-test", Instant.now().plusSeconds(60));
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + forged)).andExpect(status().isUnauthorized());
	}

	@Test
	void expiredTokenIs401() throws Exception {
		String expired = TestTokens.sign(UUID.randomUUID(), TestTokens.SECRET, "popspot-test", Instant.now().minusSeconds(3600));
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + expired)).andExpect(status().isUnauthorized());
	}

	@Test
	void wrongIssuerIs401() throws Exception {
		String token = TestTokens.sign(UUID.randomUUID(), TestTokens.SECRET, "someone-else", Instant.now().plusSeconds(60));
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
	}

	@Test
	void firstRequestProvisionsCustomerAndIgnoresTokenRoleClaim() throws Exception {
		UUID user = UUID.randomUUID();
		mvc.perform(get("/api/me").header("Authorization", TestTokens.bearer(user)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(user.toString()))
			.andExpect(jsonPath("$.roles.length()").value(1))
			.andExpect(jsonPath("$.roles[0]").value("CUSTOMER"));
	}

	@Test
	void customerCannotReachAdminApi() throws Exception {
		mvc.perform(get("/api/admin/session").header("Authorization", TestTokens.bearer(UUID.randomUUID())))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("FORBIDDEN"));
	}

	@Test
	void adminGrantedInDatabaseCanReachAdminApi() throws Exception {
		UUID admin = UUID.randomUUID();
		mvc.perform(get("/api/me").header("Authorization", TestTokens.bearer(admin))).andExpect(status().isOk());
		jdbc.sql("insert into user_roles (user_id, role) values (?, 'ADMIN')").param(admin).update();
		mvc.perform(get("/api/admin/session").header("Authorization", TestTokens.bearer(admin)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.roles").value(org.hamcrest.Matchers.hasItem("ADMIN")));
	}

	@Test
	void opsApiRequiresOpsTestRole() throws Exception {
		mvc.perform(get("/api/ops/anything").header("Authorization", TestTokens.bearer(UUID.randomUUID()))).andExpect(status().isForbidden());
	}

	@Test
	void healthStaysPublic() throws Exception {
		mvc.perform(get("/actuator/health")).andExpect(status().isOk());
	}

}
