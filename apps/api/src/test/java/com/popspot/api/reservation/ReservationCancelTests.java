package com.popspot.api.reservation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.popspot.api.TestClock;
import com.popspot.api.TestData;
import com.popspot.api.TestTokens;
import com.popspot.api.TestcontainersConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ReservationCancelTests {

	static final Instant OPENS = Instant.parse("2026-10-20T05:00:00Z");

	static final Instant SLOT_START = Instant.parse("2026-11-01T06:00:00Z");

	/** Default policy: free cancellation until 24 hours before the slot starts. */
	static final Instant DEADLINE = SLOT_START.minus(Duration.ofHours(24));

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	TestClock clock;

	UUID user = UUID.randomUUID();

	long slot;

	String reservation;

	@BeforeEach
	void book() throws Exception {
		clock.set(OPENS.plusSeconds(60));
		long popup = TestData.popup(jdbc, "C" + UUID.randomUUID().toString().substring(0, 8), "PUBLISHED", OPENS);
		slot = TestData.slot(jdbc, popup, SLOT_START, 5, 0);
		reservation = id(reserve(user, slot, 3));
	}

	@AfterEach
	void resetClock() {
		clock.reset();
	}

	@Test
	void cancelReturnsSeatsOnceAndIsIdempotent() throws Exception {
		cancel(user, reservation).andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("CANCELLED"))
			.andExpect(jsonPath("$.cancellable").value(false))
			.andExpect(jsonPath("$.cancelledAt").value(OPENS.plusSeconds(60).toString()));
		assertThat(reserved()).isZero();

		cancel(user, reservation).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
		assertThat(reserved()).isZero();
		assertThat(events("CANCELLED")).isEqualTo(1);
	}

	@Test
	void deadlineIsExclusiveOnServerClock() throws Exception {
		clock.set(DEADLINE.minusMillis(1));
		mvc.perform(get("/api/reservations/{id}", reservation).header("Authorization", TestTokens.bearer(user)))
			.andExpect(jsonPath("$.cancellable").value(true));
		clock.set(DEADLINE);
		cancel(user, reservation).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CANCEL_DEADLINE_PASSED"));
		assertThat(reserved()).isEqualTo(3);
	}

	@Test
	void checkedInCannotBeCancelled() throws Exception {
		jdbc.sql("update reservations set status = 'CHECKED_IN', checked_in_at = now() where id = ?::uuid").param(reservation).update();
		cancel(user, reservation).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("NOT_CANCELLABLE"));
	}

	@Test
	void otherUsersCannotCancel() throws Exception {
		cancel(UUID.randomUUID(), reservation).andExpect(status().isNotFound());
		assertThat(reserved()).isEqualTo(3);
	}

	@Test
	void cancelledSeatsCanBeBookedAgain() throws Exception {
		cancel(user, reservation).andExpect(status().isOk());
		reserve(UUID.randomUUID(), slot, 4).andExpect(status().isCreated());
		reserve(UUID.randomUUID(), slot, 1).andExpect(status().isCreated());
		reserve(user, slot, 1).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SOLD_OUT"));
	}

	@Test
	void concurrentCancelsReleaseSeatsExactlyOnce() throws Exception {
		ExecutorService pool = Executors.newFixedThreadPool(16);
		CountDownLatch start = new CountDownLatch(1);
		try {
			List<Future<Integer>> futures = new ArrayList<>();
			for (int i = 0; i < 16; i++) {
				futures.add(pool.submit(() -> {
					start.await();
					return cancel(user, reservation).andReturn().getResponse().getStatus();
				}));
			}
			start.countDown();
			for (Future<Integer> f : futures) {
				assertThat(f.get()).isEqualTo(200);
			}
		}
		finally {
			pool.shutdownNow();
		}
		assertThat(reserved()).isZero();
		assertThat(events("CANCELLED")).isEqualTo(1);
	}

	@Test
	void listSplitsUpcomingPastAndCancelledWithCounts() throws Exception {
		long other = TestData.slot(jdbc, jdbc.sql("select popup_id from slots where id = ?").param(slot).query(Long.class).single(),
				SLOT_START.plus(Duration.ofDays(1)), 5, 0);
		String second = id(reserve(user, other, 1));
		cancel(user, second).andExpect(status().isOk());

		list(user, "UPCOMING").andExpect(jsonPath("$.items.length()").value(1))
			.andExpect(jsonPath("$.items[0].id").value(reservation))
			.andExpect(jsonPath("$.counts.upcoming").value(1))
			.andExpect(jsonPath("$.counts.past").value(0))
			.andExpect(jsonPath("$.counts.cancelled").value(1));
		list(user, "CANCELLED").andExpect(jsonPath("$.items[0].id").value(second)).andExpect(jsonPath("$.totalItems").value(1));

		clock.set(SLOT_START.plus(Duration.ofHours(2)));
		list(user, "PAST").andExpect(jsonPath("$.items[0].id").value(reservation));
		list(user, "UPCOMING").andExpect(jsonPath("$.items.length()").value(0));
		list(UUID.randomUUID(), "UPCOMING").andExpect(jsonPath("$.totalItems").value(0));
		mvc.perform(get("/api/reservations").param("tab", "NOPE").header("Authorization", TestTokens.bearer(user)))
			.andExpect(status().isBadRequest());
	}

	private ResultActions list(UUID who, String tab) throws Exception {
		return mvc.perform(get("/api/reservations").param("tab", tab).header("Authorization", TestTokens.bearer(who))).andExpect(status().isOk());
	}

	private ResultActions cancel(UUID who, String id) throws Exception {
		return mvc.perform(post("/api/reservations/{id}/cancel", id).header("Authorization", TestTokens.bearer(who)));
	}

	private ResultActions reserve(UUID who, long slotId, int party) throws Exception {
		return mvc.perform(post("/api/reservations").header("Authorization", TestTokens.bearer(who))
			.header("Idempotency-Key", "key-" + UUID.randomUUID())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"slotId\":%d,\"partySize\":%d,\"contactName\":\"김팝업\",\"contactPhone\":\"01012345678\",\"contactEmail\":\"popup@example.com\"}"
				.formatted(slotId, party)));
	}

	private static String id(ResultActions result) throws Exception {
		return result.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString().split("\"id\":\"")[1].substring(0, 36);
	}

	private int reserved() {
		return jdbc.sql("select reserved_count from slots where id = ?").param(slot).query(Integer.class).single();
	}

	private int events(String type) {
		return jdbc.sql("select count(*) from reservation_events where reservation_id = ?::uuid and type = ?").params(reservation, type)
			.query(Integer.class).single();
	}

}
