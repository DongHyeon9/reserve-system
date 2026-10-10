package com.popspot.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ApiApplicationTests {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	@Test
	void healthIsUp() throws Exception {
		mvc.perform(get("/actuator/health"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("UP"));
	}

	@Test
	void otherActuatorEndpointsAreNotExposed() throws Exception {
		mvc.perform(get("/actuator/env").header("Authorization", TestTokens.bearer(java.util.UUID.randomUUID()))).andExpect(status().isNotFound());
	}

	@Test
	void flywayAppliedBaseline() {
		Integer applied = jdbc.sql("select count(*) from flyway_schema_history where success").query(Integer.class).single();
		org.assertj.core.api.Assertions.assertThat(applied).isGreaterThanOrEqualTo(1);
	}

}
