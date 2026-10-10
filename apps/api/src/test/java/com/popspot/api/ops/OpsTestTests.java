package com.popspot.api.ops;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.popspot.api.TestClock;
import com.popspot.api.TestTokens;
import com.popspot.api.TestcontainersConfiguration;
import com.popspot.api.common.ApiException;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OpsTestTests {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	OpsTestService service;

	@Autowired
	TestClock clock;

	UUID operator;

	@BeforeEach
	void operator() throws Exception {
		operator = UUID.randomUUID();
		mvc.perform(get("/api/me").header("Authorization", TestTokens.bearer(operator))).andExpect(status().isOk());
		jdbc.sql("insert into user_roles (user_id, role) values (?, 'OPS_TEST')").param(operator).update();
	}

	@AfterEach
	void stopAnything() {
		jdbc.sql("select id from operation_test_runs where status = 'RUNNING'").query(UUID.class).list().forEach(id -> service.stop(operator, id));
		clock.reset();
	}

	@Test
	void concurrentReserveNeverOverbooksAndSyntheticTargetStaysHidden() throws Exception {
		String id = field(call(post("/api/ops/tests").contentType(MediaType.APPLICATION_JSON).content(form("CONCURRENT_RESERVE", 30, 60, 5, 10)))
			.andExpect(status().isAccepted())
			.andExpect(jsonPath("$.status").value("RUNNING"))
			.andReturn().getResponse().getContentAsString(), "id");
		call(post("/api/ops/tests").contentType(MediaType.APPLICATION_JSON).content(form("LOAD", 1, 1, 5, 1)))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("TEST_ALREADY_RUNNING"));

		long slot = jdbc.sql("select target_slot_id from operation_test_runs where id = ?::uuid").param(id).query(Long.class).single();
		long popup = jdbc.sql("select target_popup_id from operation_test_runs where id = ?::uuid").param(id).query(Long.class).single();
		mvc.perform(get("/api/popups/{id}", popup)).andExpect(status().isNotFound());
		mvc.perform(post("/api/reservations").header("Authorization", TestTokens.bearer(UUID.randomUUID())).header("Idempotency-Key", "key-" + UUID.randomUUID())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"slotId\":%d,\"partySize\":1,\"contactName\":\"고객\",\"contactPhone\":\"01012345678\",\"contactEmail\":\"a@example.com\"}".formatted(slot)))
			.andExpect(status().isNotFound());

		String admin = TestTokens.bearer(operator);
		jdbc.sql("insert into user_roles (user_id, role) values (?, 'ADMIN')").param(operator).update();
		mvc.perform(get("/api/admin/popups/{id}", popup).header("Authorization", admin)).andExpect(status().isNotFound());
		mvc.perform(get("/api/admin/popups/{id}/slots", popup).header("Authorization", admin)).andExpect(status().isNotFound());
		mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/admin/slots/{id}", slot).header("Authorization", admin)
			.contentType(MediaType.APPLICATION_JSON).content("{\"capacity\":1}")).andExpect(status().isNotFound());
		mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/admin/slots/{id}", slot).header("Authorization", admin))
			.andExpect(status().isNotFound());

		waitUntilFinished(id);
		call(get("/api/ops/tests/current"))
			.andExpect(jsonPath("$.id").value(id))
			.andExpect(jsonPath("$.status").value("COMPLETED"))
			.andExpect(jsonPath("$.metrics.reservedCount").value(10))
			.andExpect(jsonPath("$.metrics.overbooked").value(0))
			.andExpect(jsonPath("$.metrics.failures").value(0))
			.andExpect(jsonPath("$.startedByMasked").value(org.hamcrest.Matchers.containsString("***")));
		assertThat(jdbc.sql("select count(*) from reservations where slot_id = ? and status <> 'CANCELLED'").param(slot).query(Integer.class).single()).isEqualTo(10);
	}

	@Test
	void stopEndsRunEarlyAndCleanupDeletesSyntheticDataAfterTtl() throws Exception {
		String id = field(call(post("/api/ops/tests").contentType(MediaType.APPLICATION_JSON).content(form("LOAD", 5, 20, 60, 5)))
			.andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString(), "id");
		Thread.sleep(1000);
		Instant before = Instant.now();
		call(post("/api/ops/tests/{id}/stop", id)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("STOPPED"));
		assertThat(Duration.between(before, Instant.now())).isLessThan(Duration.ofSeconds(6));
		long popup = jdbc.sql("select target_popup_id from operation_test_runs where id = ?::uuid").param(id).query(Long.class).single();

		assertThat(service.cleanupExpired()).isZero(); // TTL not reached yet
		clock.set(Instant.now().plus(Duration.ofMinutes(OpsTestService.DATA_TTL_MINUTES + 1)));
		assertThat(service.cleanupExpired()).isGreaterThanOrEqualTo(1);
		assertThat(jdbc.sql("select count(*) from popups where id = ?").param(popup).query(Integer.class).single()).isZero();
		assertThat(jdbc.sql("select count(*) from app_users where email like ?").param("run-" + id + "-%").query(Integer.class).single()).isZero();
		call(get("/api/ops/tests")).andExpect(jsonPath("$[0].id").value(id)).andExpect(jsonPath("$[0].status").value("STOPPED"));
	}

	@Test
	void limitsAreEnforcedByTheServer() throws Exception {
		call(post("/api/ops/tests").contentType(MediaType.APPLICATION_JSON).content(form("LOAD", 101, 10, 30, 10)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors[0].field").value("virtualUsers"));
		call(post("/api/ops/tests").contentType(MediaType.APPLICATION_JSON).content(form("LOAD", 10, 101, 61, 10)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.length()").value(2));
		call(post("/api/ops/tests").contentType(MediaType.APPLICATION_JSON).content(form("DROP_TABLES", 10, 10, 30, 10))).andExpect(status().isBadRequest());
	}

	@Test
	void requiresOpsTestRole() throws Exception {
		String admin = TestTokens.bearer(UUID.randomUUID());
		mvc.perform(get("/api/ops/tests/config").header("Authorization", admin)).andExpect(status().isForbidden());
		call(get("/api/ops/tests/config")).andExpect(jsonPath("$.enabled").value(true)).andExpect(jsonPath("$.limits.maxRps").value(100));
	}

	@Test
	void prodProfileRefusesTheFeatureAndDisabledFlagBlocksRuns() {
		var prod = new MockEnvironment();
		prod.setActiveProfiles("prod");
		assertThatThrownBy(() -> new OpsTestService(null, null, null, null, null, null, null, prod, true)).hasMessageContaining("prod");
		var disabled = new OpsTestService(null, null, null, null, null, null, null, new MockEnvironment(), false);
		assertThatThrownBy(() -> disabled.start(UUID.randomUUID(), new OpsTestService.StartForm("LOAD", 1, 1, 5, 1)))
			.isInstanceOf(ApiException.class)
			.hasMessageContaining("비활성화");
	}

	private void waitUntilFinished(String id) throws InterruptedException {
		for (int i = 0; i < 60; i++) {
			String status = jdbc.sql("select status from operation_test_runs where id = ?::uuid").param(id).query(String.class).single();
			if (!"RUNNING".equals(status)) {
				return;
			}
			Thread.sleep(500);
		}
		throw new AssertionError("run did not finish");
	}

	private static String form(String scenario, int users, int rps, int seconds, int capacity) {
		return "{\"scenario\":\"%s\",\"virtualUsers\":%d,\"targetRps\":%d,\"durationSeconds\":%d,\"capacity\":%d}".formatted(scenario, users, rps, seconds, capacity);
	}

	private static String field(String json, String name) {
		return json.split("\"" + name + "\":\"")[1].split("\"")[0];
	}

	private ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request.header("Authorization", TestTokens.bearer(operator)));
	}

}
