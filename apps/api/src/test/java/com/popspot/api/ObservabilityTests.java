package com.popspot.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest
@AutoConfigureMockMvc
@Import({ TestcontainersConfiguration.class, ObservabilityTests.Failing.class })
@ExtendWith(OutputCaptureExtension.class)
class ObservabilityTests {

	static final String PHONE = "010-5555-4444";

	static final String EMAIL = "leak-check@example.com";

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	/** Simulates an unexpected failure whose message carries personal data (like a constraint violation detail). */
	@TestConfiguration
	@RestController
	static class Failing {

		@GetMapping("/api/test-only/boom")
		String boom() {
			throw new IllegalStateException("Key (contact_phone)=(" + PHONE + ") email " + EMAIL);
		}

	}

	@Test
	void requestIdIsEchoedWhenWellFormedAndReplacedOtherwise() throws Exception {
		mvc.perform(get("/actuator/health").header("X-Request-Id", "next-1234abcd")).andExpect(header().string("X-Request-Id", "next-1234abcd"));
		String replaced = mvc.perform(get("/actuator/health").header("X-Request-Id", "<script>alert(1)</script>"))
			.andReturn().getResponse().getHeader("X-Request-Id");
		assertThat(replaced).matches("[0-9a-f-]{36}");
	}

	@Test
	void unexpectedErrorsLogClassNamesAndRouteButNoPersonalData(CapturedOutput output) throws Exception {
		mvc.perform(get("/api/test-only/boom").header("Authorization", TestTokens.bearer(UUID.randomUUID())))
			.andExpect(status().isInternalServerError())
			.andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
			.andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString(PHONE))));
		assertThat(output).contains("java.lang.IllegalStateException").contains("/api/test-only/boom -> 500");
		assertThat(output).doesNotContain(PHONE).doesNotContain(EMAIL).doesNotContain("Bearer ");
	}

	@Test
	void businessConflictsAreLoggedByCodeWithoutContactData(CapturedOutput output) throws Exception {
		long popup = TestData.popup(jdbc, "관측 " + UUID.randomUUID().toString().substring(0, 6), "PUBLISHED", Instant.parse("2020-01-01T00:00:00Z"));
		long slot = TestData.slot(jdbc, popup, Instant.now().plusSeconds(86_400), 1, 1);
		mvc.perform(post("/api/reservations").header("Authorization", TestTokens.bearer(UUID.randomUUID())).header("Idempotency-Key", "key-" + UUID.randomUUID())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"slotId\":%d,\"partySize\":1,\"contactName\":\"김관측\",\"contactPhone\":\"%s\",\"contactEmail\":\"%s\"}".formatted(slot, PHONE, EMAIL)))
			.andExpect(status().isConflict());
		assertThat(output).contains("Business conflict SOLD_OUT");
		assertThat(output).doesNotContain(PHONE).doesNotContain(EMAIL).doesNotContain("김관측");
	}

}
