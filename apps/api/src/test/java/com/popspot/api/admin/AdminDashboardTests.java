package com.popspot.api.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;

import com.popspot.api.TestClock;
import com.popspot.api.TestData;
import com.popspot.api.TestTokens;
import com.popspot.api.TestcontainersConfiguration;

/**
 * Uses a calendar day (2031-03-15 KST) no other test writes to, so shared-database rows from other classes cannot
 * leak into the counts.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AdminDashboardTests {

	static final Instant NOW = Instant.parse("2031-03-15T01:00:00Z"); // 10:00 KST

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	TestClock clock;

	@AfterEach
	void resetClock() {
		clock.reset();
	}

	@Test
	void aggregatesTodayInKstWithBoundariesRatesAndAlerts() throws Exception {
		UUID admin = admin();
		long popup = TestData.popup(jdbc, "대시보드 팝업", "PUBLISHED", Instant.parse("2031-03-01T00:00:00Z"));
		// Same-day sessions: allow cancellation until start so a cancel can happen today.
		jdbc.sql("update popups set cancel_cutoff_hours = 0 where id = ?").param(popup).update();
		long midnight = TestData.slot(jdbc, popup, Instant.parse("2031-03-14T15:00:00Z"), 5, 0); // 00:00 KST today (inclusive)
		long slotA = TestData.slot(jdbc, popup, Instant.parse("2031-03-15T06:00:00Z"), 5, 0); // 15:00 KST
		long slotB = TestData.slot(jdbc, popup, Instant.parse("2031-03-15T08:00:00Z"), 2, 0); // 17:00 KST
		long nearlyFull = TestData.slot(jdbc, popup, Instant.parse("2031-03-15T09:00:00Z"), 10, 8); // 18:00 KST, 2 left
		TestData.slot(jdbc, popup, Instant.parse("2031-03-15T15:00:00Z"), 5, 0); // 00:00 KST tomorrow (excluded)
		long opening = TestData.popup(jdbc, "곧 열리는 팝업", "PUBLISHED", Instant.parse("2031-03-18T05:00:00Z"));
		TestData.popup(jdbc, "한참 뒤 팝업", "PUBLISHED", Instant.parse("2031-03-30T05:00:00Z"));

		clock.set(Instant.parse("2031-03-14T05:00:00Z")); // yesterday in KST
		reserve(UUID.randomUUID(), slotA, 1);

		clock.set(NOW);
		String checkedIn = reserve(UUID.randomUUID(), slotA, 1);
		UUID canceller = UUID.randomUUID();
		String cancelled = reserve(canceller, slotA, 1);
		reserve(UUID.randomUUID(), slotB, 2);
		mvc.perform(post("/api/reservations/{id}/cancel", cancelled).header("Authorization", TestTokens.bearer(canceller))).andExpect(status().isOk());
		jdbc.sql("update reservations set status = 'CHECKED_IN', checked_in_at = now() where id = ?::uuid").param(checkedIn).update();

		mvc.perform(get("/api/admin/dashboard").header("Authorization", TestTokens.bearer(admin)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.date").value("2031-03-15"))
			.andExpect(jsonPath("$.kpis.todayReservations").value(3))
			.andExpect(jsonPath("$.kpis.yesterdayReservations").value(1))
			.andExpect(jsonPath("$.kpis.reservationDeltaPercent").value(200.0))
			.andExpect(jsonPath("$.kpis.expectedVisits").value(3))
			.andExpect(jsonPath("$.kpis.todayVisits").value(1))
			.andExpect(jsonPath("$.kpis.checkInRatePercent").value(33.3))
			.andExpect(jsonPath("$.kpis.todaySlots").value(4))
			.andExpect(jsonPath("$.kpis.soldOutSlots").value(1))
			.andExpect(jsonPath("$.kpis.todayCancellations").value(1))
			.andExpect(jsonPath("$.kpis.cancelRatePercent").value(33.3))
			.andExpect(jsonPath("$.todaySlots.length()").value(4))
			.andExpect(jsonPath("$.todaySlots[0].slotId").value(midnight))
			.andExpect(jsonPath("$.todaySlots[2].reserved").value(2))
			.andExpect(jsonPath("$.alerts.length()").value(2))
			.andExpect(jsonPath("$.alerts[0].type").value("SLOT_NEARLY_FULL"))
			.andExpect(jsonPath("$.alerts[0].slotId").value(nearlyFull))
			.andExpect(jsonPath("$.alerts[0].remaining").value(2))
			.andExpect(jsonPath("$.alerts[1].type").value("OPENING_SOON"))
			.andExpect(jsonPath("$.alerts[1].popupId").value(opening));
	}

	@Test
	void emptyDayHasNullRatesInsteadOfDivisionByZero() throws Exception {
		clock.set(Instant.parse("2031-07-01T01:00:00Z"));
		mvc.perform(get("/api/admin/dashboard").header("Authorization", TestTokens.bearer(admin())))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.kpis.todayReservations").value(0))
			.andExpect(jsonPath("$.kpis.reservationDeltaPercent").doesNotExist())
			.andExpect(jsonPath("$.kpis.checkInRatePercent").doesNotExist())
			.andExpect(jsonPath("$.kpis.cancelRatePercent").doesNotExist())
			.andExpect(jsonPath("$.todaySlots.length()").value(0));
	}

	@Test
	void onlyAdminsCanReadTheDashboard() throws Exception {
		mvc.perform(get("/api/admin/dashboard")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/admin/dashboard").header("Authorization", TestTokens.bearer(UUID.randomUUID())))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("FORBIDDEN"));
	}

	private UUID admin() throws Exception {
		UUID admin = UUID.randomUUID();
		mvc.perform(get("/api/me").header("Authorization", TestTokens.bearer(admin))).andExpect(status().isOk());
		jdbc.sql("insert into user_roles (user_id, role) values (?, 'ADMIN')").param(admin).update();
		return admin;
	}

	private String reserve(UUID who, long slotId, int party) throws Exception {
		return mvc.perform(post("/api/reservations").header("Authorization", TestTokens.bearer(who))
			.header("Idempotency-Key", "key-" + UUID.randomUUID())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"slotId\":%d,\"partySize\":%d,\"contactName\":\"김팝업\",\"contactPhone\":\"01012345678\",\"contactEmail\":\"a@example.com\"}"
				.formatted(slotId, party)))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString().split("\"id\":\"")[1].substring(0, 36);
	}

}
