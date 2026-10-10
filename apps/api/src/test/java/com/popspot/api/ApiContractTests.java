package com.popspot.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ApiContractTests {

	static final Path SNAPSHOT = Path.of("src/test/resources/contract/openapi.json");

	static final JsonMapper JSON = JsonMapper.builder().enable(SerializationFeature.INDENT_OUTPUT).build();

	@Autowired
	MockMvc mvc;

	/** The published API surface is frozen. Run with UPDATE_CONTRACT=1 after an intentional change and review the diff. */
	@Test
	void openApiMatchesSnapshot() throws Exception {
		String body = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
		JsonNode actual = JSON.readTree(body);
		if ("1".equals(System.getenv("UPDATE_CONTRACT"))) {
			Files.writeString(SNAPSHOT, JSON.writeValueAsString(actual) + "\n");
		}
		assertThat(actual).isEqualTo(JSON.readTree(Files.readString(SNAPSHOT)));
	}

	@Test
	void unknownRouteUsesProblemShape() throws Exception {
		mvc.perform(get("/api/does-not-exist").header("Authorization", TestTokens.bearer(UUID.randomUUID())))
			.andExpect(status().isNotFound())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.status").value(404))
			.andExpect(jsonPath("$.code").value("NOT_FOUND"))
			.andExpect(jsonPath("$.detail").isString())
			.andExpect(jsonPath("$.errors").doesNotExist());
	}

}
