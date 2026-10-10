package com.popspot.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.popspot.api.TestClock;
import com.popspot.api.TestData;
import com.popspot.api.TestTokens;
import com.popspot.api.TestcontainersConfiguration;

/** Pinned to 2032-02-10 10:00 KST, a day no other test class uses. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AdminReservationTests {

	static final Instant NOW = Instant.parse("2032-02-10T01:00:00Z");

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	TestClock clock;

	UUID admin;

	String name;

	long todaySlot;

	long tomorrowSlot;

	@BeforeEach
	void seed() throws Exception {
		admin = UUID.randomUUID();
		mvc.perform(get("/api/me").header("Authorization", TestTokens.bearer(admin))).andExpect(status().isOk());
		jdbc.sql("insert into user_roles (user_id, role) values (?, 'ADMIN')").param(admin).update();
		long popup = TestData.popup(jdbc, "운영 " + UUID.randomUUID().toString().substring(0, 6), "PUBLISHED", Instant.parse("2032-01-01T00:00:00Z"));
		todaySlot = TestData.slot(jdbc, popup, Instant.parse("2032-02-10T06:00:00Z"), 10, 0); // 15:00 KST today
		tomorrowSlot = TestData.slot(jdbc, popup, Instant.parse("2032-02-11T06:00:00Z"), 10, 0);
		name = "고객" + UUID.randomUUID().toString().substring(0, 4);
		clock.set(NOW);
	}

	@AfterEach
	void resetClock() {
		clock.reset();
	}

	@Test
	void searchByCodeNamePhoneDateAndStatusWithMasking() throws Exception {
		String code = field(reserve(todaySlot, 2, "010-2222-7788"), "code");
		reserve(tomorrowSlot, 1, "010-3333-9911");

		call(get("/api/admin/reservations").param("q", code.toLowerCase()))
			.andExpect(jsonPath("$.totalItems").value(1))
			.andExpect(jsonPath("$.items[0].contactName").value(name))
			.andExpect(jsonPath("$.items[0].contactPhoneMasked").value("010-22**-77**"))
			.andExpect(jsonPath("$.items[0].contactPhone").doesNotExist());
		call(get("/api/admin/reservations").param("q", name)).andExpect(jsonPath("$.totalItems").value(2));
		call(get("/api/admin/reservations").param("q", "9911").param("date", "2032-02-11")).andExpect(jsonPath("$.totalItems").value(1));
		call(get("/api/admin/reservations").param("q", name).param("date", "2032-02-10"))
			.andExpect(jsonPath("$.totalItems").value(1))
			.andExpect(jsonPath("$.items[0].code").value(code));
		call(get("/api/admin/reservations").param("q", name).param("status", "CANCELLED")).andExpect(jsonPath("$.totalItems").value(0));
		call(get("/api/admin/reservations").param("q", name).param("size", "1").param("page", "9"))
			.andExpect(jsonPath("$.items.length()").value(0))
			.andExpect(jsonPath("$.totalItems").value(2));
		call(get("/api/admin/reservations").param("q", "%")).andExpect(jsonPath("$.items[?(@.contactName == '" + name + "')]").isEmpty());
	}

	@Test
	void detailMasksContactAndRevealIsAudited() throws Exception {
		String id = field(reserve(todaySlot, 1, "010-1234-5678"), "id");
		call(get("/api/admin/reservations/{id}", id))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.contactPhoneMasked").value("010-12**-56**"))
			.andExpect(jsonPath("$.contactEmailMasked").value("p***p@example.com"))
			.andExpect(jsonPath("$.canCheckIn").value(true))
			.andExpect(jsonPath("$.events[0].type").value("CREATED"))
			.andExpect(jsonPath("$.events[0].actorRole").value("CUSTOMER"));
		call(post("/api/admin/reservations/{id}/contact", id))
			.andExpect(jsonPath("$.contactPhone").value("010-1234-5678"))
			.andExpect(jsonPath("$.contactEmail").value("popup@example.com"));
		assertThat(audits(id, "CONTACT_REVEALED")).isEqualTo(1);
		assertThat(jdbc.sql("select detail::text from audit_logs where target_id = ? and action = 'CONTACT_REVEALED'").param(id).query(String.class).single())
			.doesNotContain("010").doesNotContain("@");
	}

	@Test
	void checkInOnlyOnVisitDayAndIsIdempotent() throws Exception {
		String today = field(reserve(todaySlot, 1, "010-1234-5678"), "id");
		String tomorrow = field(reserve(tomorrowSlot, 1, "010-1234-5679"), "id");

		call(post("/api/admin/reservations/{id}/check-in", tomorrow))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("CHECK_IN_NOT_TODAY"));
		call(post("/api/admin/reservations/{id}/check-in", today))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("CHECKED_IN"))
			.andExpect(jsonPath("$.canCancel").value(false))
			.andExpect(jsonPath("$.events[1].type").value("CHECKED_IN"))
			.andExpect(jsonPath("$.events[1].actorRole").value("ADMIN"));
		call(post("/api/admin/reservations/{id}/check-in", today)).andExpect(status().isOk());
		assertThat(audits(today, "RESERVATION_CHECKED_IN")).isEqualTo(1);
		call(post("/api/admin/reservations/{id}/cancel", today).contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"테스트\"}"))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("NOT_CANCELLABLE"));
	}

	@Test
	void adminCancelIgnoresCustomerDeadlineReturnsSeatsOnceAndBlocksCheckIn() throws Exception {
		String id = field(reserve(todaySlot, 3, "010-1234-5678"), "id"); // today: customer deadline already passed
		call(post("/api/admin/reservations/{id}/cancel", id).contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors[0].field").value("reason"));
		call(post("/api/admin/reservations/{id}/cancel", id).contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"고객 010-9876-5432 요청 a@b.com\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("CANCELLED"))
			.andExpect(jsonPath("$.events[1].actorRole").value("ADMIN"));
		call(post("/api/admin/reservations/{id}/cancel", id).contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"중복\"}"))
			.andExpect(status().isOk());
		assertThat(jdbc.sql("select reserved_count from slots where id = ?").param(todaySlot).query(Integer.class).single()).isZero();
		assertThat(audits(id, "RESERVATION_CANCELLED")).isEqualTo(1);
		assertThat(jdbc.sql("select detail::text from audit_logs where target_id = ? and action = 'RESERVATION_CANCELLED'").param(id).query(String.class).single())
			.doesNotContain("010").doesNotContain("@");
		call(post("/api/admin/reservations/{id}/check-in", id)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("NOT_CHECKINABLE"));
	}

	@Test
	void unknownIdsAre404AndCustomersAreForbidden() throws Exception {
		call(get("/api/admin/reservations/{id}", UUID.randomUUID())).andExpect(status().isNotFound());
		String customer = TestTokens.bearer(UUID.randomUUID());
		mvc.perform(get("/api/admin/reservations").header("Authorization", customer)).andExpect(status().isForbidden());
		mvc.perform(post("/api/admin/reservations/{id}/contact", UUID.randomUUID()).header("Authorization", customer)).andExpect(status().isForbidden());
	}

	private String reserve(long slot, int party, String phone) throws Exception {
		return mvc.perform(post("/api/reservations").header("Authorization", TestTokens.bearer(UUID.randomUUID()))
			.header("Idempotency-Key", "key-" + UUID.randomUUID())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"slotId\":%d,\"partySize\":%d,\"contactName\":\"%s\",\"contactPhone\":\"%s\",\"contactEmail\":\"popup@example.com\"}"
				.formatted(slot, party, name, phone)))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
	}

	private static String field(String json, String name) {
		return json.split("\"" + name + "\":\"")[1].split("\"")[0];
	}

	private int audits(String id, String action) {
		return jdbc.sql("select count(*) from audit_logs where target_type = 'RESERVATION' and target_id = ? and action = ?")
			.params(id, action)
			.query(Integer.class)
			.single();
	}

	private ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request.header("Authorization", TestTokens.bearer(admin)));
	}

}
