package com.popspot.api.reservation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.popspot.api.TestClock;
import com.popspot.api.TestData;
import com.popspot.api.TestTokens;
import com.popspot.api.TestcontainersConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ReservationApiTests {

	static final Instant OPENS = Instant.parse("2026-10-20T05:00:00Z");

	static final Instant SLOT_START = Instant.parse("2026-11-01T06:00:00Z");

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	TestClock clock;

	long popup;

	long slot;

	UUID user = UUID.randomUUID();

	@BeforeEach
	void seed() {
		clock.set(OPENS.plusSeconds(60));
		popup = TestData.popup(jdbc, "R" + UUID.randomUUID().toString().substring(0, 8), "PUBLISHED", OPENS);
		slot = TestData.slot(jdbc, popup, SLOT_START, 5, 0);
	}

	@AfterEach
	void resetClock() {
		clock.reset();
	}

	@Test
	void createsReservationAndTakesSeats() throws Exception {
		reserve(user, "key-00000001", slot, 2)
			.andExpect(status().isCreated())
			.andExpect(header().exists("Location"))
			.andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.matchesPattern("PS-261101-\\d{4,}")))
			.andExpect(jsonPath("$.status").value("CONFIRMED"))
			.andExpect(jsonPath("$.partySize").value(2))
			.andExpect(jsonPath("$.contactPhoneMasked").value("010-12**-56**"))
			.andExpect(jsonPath("$.slot.startsAt").value("2026-11-01T06:00:00Z"))
			.andExpect(jsonPath("$.cancellableUntil").value("2026-10-31T06:00:00Z"))
			.andExpect(jsonPath("$.cancellable").value(true));
		assertThat(reserved(slot)).isEqualTo(2);
		assertThat(jdbc.sql("select count(*) from reservation_events e join reservations r on r.id = e.reservation_id where r.slot_id = ? and e.type = 'CREATED'")
			.param(slot).query(Integer.class).single()).isEqualTo(1);
	}

	@Test
	void replayWithSameKeyReturnsOriginalWithoutTakingMoreSeats() throws Exception {
		String id = body(reserve(user, "key-replay-1", slot, 2).andExpect(status().isCreated())).split("\"id\":\"")[1].substring(0, 36);
		reserve(user, "key-replay-1", slot, 2)
			.andExpect(status().isOk())
			.andExpect(header().string("Idempotency-Replayed", "true"))
			.andExpect(jsonPath("$.id").value(id));
		assertThat(reserved(slot)).isEqualTo(2);
	}

	@Test
	void sameKeyWithDifferentBodyIsRejected() throws Exception {
		reserve(user, "key-reuse-01", slot, 1).andExpect(status().isCreated());
		reserve(user, "key-reuse-01", slot, 2).andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
	}

	@Test
	void failedAttemptDoesNotBurnTheKey() throws Exception {
		clock.set(OPENS.minusSeconds(1));
		reserve(user, "key-retry-01", slot, 1).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RESERVATION_NOT_OPEN"));
		clock.set(OPENS);
		reserve(user, "key-retry-01", slot, 1).andExpect(status().isCreated());
	}

	@Test
	void openBoundaryUsesServerClock() throws Exception {
		clock.set(OPENS.minusMillis(1));
		reserve(user, "key-bound-01", slot, 1).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RESERVATION_NOT_OPEN"));
		clock.set(OPENS);
		reserve(user, "key-bound-02", slot, 1).andExpect(status().isCreated());
	}

	@Test
	void manuallyClosedAndStartedSlotsAreRejected() throws Exception {
		clock.set(SLOT_START);
		reserve(user, "key-start-01", slot, 1).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SLOT_UNAVAILABLE"));
		clock.set(OPENS.plusSeconds(60));
		jdbc.sql("update popups set manually_closed = true where id = ?").param(popup).update();
		reserve(user, "key-close-01", slot, 1).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RESERVATION_NOT_OPEN"));
	}

	@Test
	void notEnoughSeatsIsSoldOut() throws Exception {
		reserve(UUID.randomUUID(), "key-fill-001", slot, 4).andExpect(status().isCreated());
		reserve(user, "key-fill-002", slot, 2).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SOLD_OUT"));
		reserve(user, "key-fill-003", slot, 1).andExpect(status().isCreated());
		assertThat(reserved(slot)).isEqualTo(5);
	}

	@Test
	void secondActiveBookingForSameSlotIsDuplicate() throws Exception {
		reserve(user, "key-dup-0001", slot, 1).andExpect(status().isCreated());
		reserve(user, "key-dup-0002", slot, 1).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DUPLICATE_RESERVATION"));
		assertThat(reserved(slot)).isEqualTo(1);
	}

	@Test
	void validationAndPartyLimits() throws Exception {
		mvc.perform(post("/api/reservations").header("Authorization", TestTokens.bearer(user)).header("Idempotency-Key", "key-valid-01")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"slotId\":%d,\"partySize\":1,\"contactName\":\"\",\"contactPhone\":\"02-123\",\"contactEmail\":\"x\"}".formatted(slot)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.errors.length()").value(3));
		reserve(user, "key-party-01", slot, 5).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PARTY_SIZE_EXCEEDED"));
		mvc.perform(post("/api/reservations").header("Authorization", TestTokens.bearer(user)).contentType(MediaType.APPLICATION_JSON).content(json(slot, 1)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("HEADER_REQUIRED"));
		reserve(user, "short", slot, 1).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_INVALID"));
		reserve(user, "key-nope-001", 999_999_999L, 1).andExpect(status().isNotFound());
		assertThat(reserved(slot)).isZero();
	}

	@Test
	void requiresLoginAndHidesOtherUsersReservations() throws Exception {
		mvc.perform(post("/api/reservations").header("Idempotency-Key", "key-anon-001").contentType(MediaType.APPLICATION_JSON).content(json(slot, 1)))
			.andExpect(status().isUnauthorized());
		String id = body(reserve(user, "key-owner-01", slot, 1)).split("\"id\":\"")[1].substring(0, 36);
		mvc.perform(get("/api/reservations/{id}", id).header("Authorization", TestTokens.bearer(user))).andExpect(status().isOk());
		mvc.perform(get("/api/reservations/{id}", id).header("Authorization", TestTokens.bearer(UUID.randomUUID())))
			.andExpect(status().isNotFound());
	}

	@Test
	void parallelBookingsNeverOverbook() throws Exception {
		long hot = TestData.slot(jdbc, popup, SLOT_START.plusSeconds(7200), 10, 0);
		List<Callable<Integer>> calls = new ArrayList<>();
		for (int i = 0; i < 80; i++) {
			UUID someone = UUID.randomUUID();
			calls.add(() -> reserve(someone, "key-par-" + someone, hot, 1).andReturn().getResponse().getStatus());
		}
		List<Integer> statuses = runTogether(calls);
		assertThat(statuses).filteredOn(s -> s == 201).hasSize(10);
		assertThat(statuses).filteredOn(s -> s == 409).hasSize(70);
		assertThat(reserved(hot)).isEqualTo(10);
		assertThat(jdbc.sql("select coalesce(sum(party_size), 0) from reservations where slot_id = ? and status <> 'CANCELLED'").param(hot)
			.query(Integer.class).single()).isEqualTo(10);
	}

	@Test
	void parallelRetriesWithSameKeyCreateOneReservation() throws Exception {
		List<Callable<Integer>> calls = new ArrayList<>();
		for (int i = 0; i < 20; i++) {
			calls.add(() -> reserve(user, "key-same-retry", slot, 2).andReturn().getResponse().getStatus());
		}
		List<Integer> statuses = runTogether(calls);
		assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
		assertThat(statuses).filteredOn(s -> s == 200).hasSize(19);
		assertThat(reserved(slot)).isEqualTo(2);
	}

	private List<Integer> runTogether(List<Callable<Integer>> calls) throws Exception {
		ExecutorService pool = Executors.newFixedThreadPool(32);
		CountDownLatch start = new CountDownLatch(1);
		try {
			List<Future<Integer>> futures = new ArrayList<>();
			for (Callable<Integer> call : calls) {
				futures.add(pool.submit(() -> {
					start.await();
					return call.call();
				}));
			}
			start.countDown();
			List<Integer> statuses = new ArrayList<>();
			for (Future<Integer> f : futures) {
				statuses.add(f.get());
			}
			return statuses;
		}
		finally {
			pool.shutdownNow();
		}
	}

	private ResultActions reserve(UUID who, String key, long slotId, int party) throws Exception {
		return mvc.perform(post("/api/reservations").header("Authorization", TestTokens.bearer(who))
			.header("Idempotency-Key", key)
			.contentType(MediaType.APPLICATION_JSON)
			.content(json(slotId, party)));
	}

	private static String json(long slotId, int party) {
		return "{\"slotId\":%d,\"partySize\":%d,\"contactName\":\"김팝업\",\"contactPhone\":\"010-1234-5678\",\"contactEmail\":\"popup@example.com\"}"
			.formatted(slotId, party);
	}

	private static String body(ResultActions result) throws Exception {
		MockHttpServletResponse response = result.andReturn().getResponse();
		return response.getContentAsString();
	}

	private int reserved(long slotId) {
		return jdbc.sql("select reserved_count from slots where id = ?").param(slotId).query(Integer.class).single();
	}

}
