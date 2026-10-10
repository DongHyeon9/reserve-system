package com.popspot.api.popup;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;

import com.popspot.api.TestClock;
import com.popspot.api.TestData;
import com.popspot.api.TestcontainersConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PopupApiTests {

	static final Instant OPENS = Instant.parse("2026-10-20T05:00:00Z");

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	TestClock clock;

	String tag;

	long popup;

	@BeforeEach
	void seed() {
		tag = "T" + UUID.randomUUID().toString().substring(0, 8);
		popup = TestData.popup(jdbc, tag + " 오픈 예정 전시", "PUBLISHED", OPENS);
		TestData.slot(jdbc, popup, Instant.parse("2026-11-01T02:00:00Z"), 20, 20);
		TestData.slot(jdbc, popup, Instant.parse("2026-11-01T04:00:00Z"), 20, 14);
	}

	@AfterEach
	void resetClock() {
		clock.reset();
	}

	@Test
	void waitingUntilOpensAtThenOpenExactlyAtOpensAt() throws Exception {
		clock.set(OPENS.minusSeconds(1));
		mvc.perform(get("/api/popups/{id}", popup))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.reservationStatus").value("WAITING"))
			.andExpect(jsonPath("$.serverTime").value("2026-10-20T04:59:59Z"))
			.andExpect(jsonPath("$.slots[1].reservable").value(false));

		clock.set(OPENS);
		mvc.perform(get("/api/popups/{id}", popup))
			.andExpect(jsonPath("$.reservationStatus").value("OPEN"))
			.andExpect(jsonPath("$.remainingSeats").value(6))
			.andExpect(jsonPath("$.slots.length()").value(2))
			.andExpect(jsonPath("$.slots[0].remaining").value(0))
			.andExpect(jsonPath("$.slots[0].reservable").value(false))
			.andExpect(jsonPath("$.slots[1].remaining").value(6))
			.andExpect(jsonPath("$.slots[1].reservable").value(true))
			.andExpect(jsonPath("$.slots[1].startsAt").value("2026-11-01T04:00:00Z"));
	}

	@Test
	void soldOutWhenEveryFutureSlotIsFullAndClosedAfterLastSlot() throws Exception {
		jdbc.sql("update slots set reserved_count = capacity where popup_id = ?").param(popup).update();
		clock.set(OPENS.plus(Duration.ofDays(1)));
		mvc.perform(get("/api/popups/{id}", popup)).andExpect(jsonPath("$.reservationStatus").value("SOLD_OUT"));

		clock.set(Instant.parse("2026-11-01T04:00:00Z"));
		mvc.perform(get("/api/popups/{id}", popup))
			.andExpect(jsonPath("$.reservationStatus").value("CLOSED"))
			.andExpect(jsonPath("$.slots.length()").value(0));
	}

	@Test
	void draftIsHiddenAndEndedIsClosed() throws Exception {
		long draft = TestData.popup(jdbc, tag + " 초안", "DRAFT", OPENS);
		long ended = TestData.popup(jdbc, tag + " 종료", "ENDED", OPENS);
		clock.set(OPENS.plusSeconds(60));

		mvc.perform(get("/api/popups/{id}", draft)).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
		mvc.perform(get("/api/popups/{id}", ended)).andExpect(jsonPath("$.reservationStatus").value("CLOSED"));
		mvc.perform(get("/api/popups").param("q", tag))
			.andExpect(jsonPath("$.totalItems").value(1))
			.andExpect(jsonPath("$.items[0].id").value(popup));
	}

	@Test
	void searchIsCaseInsensitiveAndTreatsWildcardsLiterally() throws Exception {
		mvc.perform(get("/api/popups").param("q", tag.toLowerCase())).andExpect(jsonPath("$.totalItems").value(1));
		mvc.perform(get("/api/popups").param("q", "%")).andExpect(jsonPath("$.items[*].id", not(hasItem((int) popup))));
	}

	@Test
	void paginationReportsTotalsAndEmptyLastPage() throws Exception {
		TestData.popup(jdbc, tag + " 두번째", "PUBLISHED", OPENS);
		mvc.perform(get("/api/popups").param("q", tag).param("size", "1").param("page", "1"))
			.andExpect(jsonPath("$.items.length()").value(1))
			.andExpect(jsonPath("$.totalItems").value(2))
			.andExpect(jsonPath("$.totalPages").value(2));
		mvc.perform(get("/api/popups").param("q", tag).param("size", "1").param("page", "2"))
			.andExpect(jsonPath("$.items.length()").value(0));
	}

	@Test
	void invalidPagingIsRejected() throws Exception {
		mvc.perform(get("/api/popups").param("size", "0"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
		mvc.perform(get("/api/popups/not-a-number")).andExpect(status().isBadRequest());
	}

	@Test
	void facetsListPublishedValues() throws Exception {
		mvc.perform(get("/api/popups/facets")).andExpect(jsonPath("$.areas", hasItem("성수"))).andExpect(jsonPath("$.categories", hasItem("테크")));
	}

}
