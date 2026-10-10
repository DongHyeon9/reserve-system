package com.popspot.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.popspot.api.TestTokens;
import com.popspot.api.TestcontainersConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AdminCatalogTests {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	PlatformTransactionManager transactions;

	UUID admin;

	String tag;

	@BeforeEach
	void admin() throws Exception {
		admin = UUID.randomUUID();
		mvc.perform(get("/api/me").header("Authorization", TestTokens.bearer(admin))).andExpect(status().isOk());
		jdbc.sql("insert into user_roles (user_id, role) values (?, 'ADMIN')").param(admin).update();
		tag = "A" + UUID.randomUUID().toString().substring(0, 8);
	}

	@Test
	void createsPopupInUtcFromKstOffsetAndAudits() throws Exception {
		long id = createPopup("DRAFT", "2031-05-01", "2031-05-10");
		call(get("/api/admin/popups/{id}", id))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.opensAt").value("2031-04-25T05:00:00Z"))
			.andExpect(jsonPath("$.publishStatus").value("DRAFT"))
			.andExpect(jsonPath("$.slotCount").value(0));
		assertThat(audits("POPUP", id, "POPUP_CREATED")).isEqualTo(1);
	}

	@Test
	void rejectsInvalidPeriodsAndTimesWithoutOffset() throws Exception {
		call(post("/api/admin/popups").contentType(MediaType.APPLICATION_JSON).content(form("DRAFT", "2031-05-10", "2031-05-01", null)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_PERIOD"));
		call(post("/api/admin/popups").contentType(MediaType.APPLICATION_JSON)
			.content(form("DRAFT", "2031-05-01", "2031-05-10", null).replace("2031-04-25T14:00:00+09:00", "2031-04-25T14:00:00")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
		call(post("/api/admin/popups").contentType(MediaType.APPLICATION_JSON).content(form("DRAFT", "2031-05-01", "2031-05-10", null).replace(tag + " 관리 팝업", "")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors[0].field").value("title"));
	}

	@Test
	void staleUpdateIsRejectedAndFreshUpdateSucceeds() throws Exception {
		long id = createPopup("DRAFT", "2031-05-01", "2031-05-10");
		String loadedAt = updatedAt(id);
		call(put("/api/admin/popups/{id}", id).contentType(MediaType.APPLICATION_JSON).content(form("PUBLISHED", "2031-05-01", "2031-05-10", loadedAt)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.publishStatus").value("PUBLISHED"))
			.andExpect(jsonPath("$.reservationStatus").value("WAITING"));
		call(put("/api/admin/popups/{id}", id).contentType(MediaType.APPLICATION_JSON).content(form("ENDED", "2031-05-01", "2031-05-10", loadedAt)))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("STALE_UPDATE"));
	}

	@Test
	void periodCannotShrinkPastExistingSlotsAndDraftNeedsNoActiveReservations() throws Exception {
		long id = createPopup("PUBLISHED", "2031-05-01", "2031-05-10");
		long slot = id(call(post("/api/admin/popups/{id}/slots", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"startsAt\":\"2031-05-09T15:00:00+09:00\",\"endsAt\":\"2031-05-09T16:00:00+09:00\",\"capacity\":5}"))
			.andExpect(status().isCreated()));
		call(put("/api/admin/popups/{id}", id).contentType(MediaType.APPLICATION_JSON).content(form("PUBLISHED", "2031-05-01", "2031-05-08", updatedAt(id))))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("SLOTS_OUTSIDE_PERIOD"));

		insertReservation(id, slot);
		call(put("/api/admin/popups/{id}", id).contentType(MediaType.APPLICATION_JSON).content(form("DRAFT", "2031-05-01", "2031-05-10", updatedAt(id))))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("HAS_RESERVATIONS"));
	}

	@Test
	void slotsStayInsidePeriodOnKstDatesAndRejectDuplicates() throws Exception {
		long id = createPopup("DRAFT", "2031-05-01", "2031-05-10");
		// 2031-05-01 00:30 KST is 2031-04-30T15:30Z: inside the period on the KST calendar.
		call(post("/api/admin/popups/{id}/slots", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"startsAt\":\"2031-04-30T15:30:00Z\",\"endsAt\":\"2031-04-30T16:30:00Z\",\"capacity\":5}"))
			.andExpect(status().isCreated());
		call(post("/api/admin/popups/{id}/slots", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"startsAt\":\"2031-04-30T23:30:00+09:00\",\"endsAt\":\"2031-05-01T00:30:00+09:00\",\"capacity\":5}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("SLOT_OUTSIDE_PERIOD"));
		call(post("/api/admin/popups/{id}/slots", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"startsAt\":\"2031-05-01T00:30:00+09:00\",\"endsAt\":\"2031-05-01T01:30:00+09:00\",\"capacity\":3}"))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("SLOT_EXISTS"));
		call(post("/api/admin/popups/{id}/slots", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"startsAt\":\"2031-05-02T10:00:00+09:00\",\"endsAt\":\"2031-05-02T10:00:00+09:00\",\"capacity\":3}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_PERIOD"));
	}

	@Test
	void bulkCreatesKstSessionsAndSkipsExisting() throws Exception {
		long id = createPopup("DRAFT", "2031-05-01", "2031-05-10");
		String bulk = "{\"fromDate\":\"2031-05-01\",\"toDate\":\"2031-05-03\",\"times\":[\"11:00\",\"15:00\"],\"durationMinutes\":40,\"capacity\":20}";
		call(post("/api/admin/popups/{id}/slots/bulk", id).contentType(MediaType.APPLICATION_JSON).content(bulk))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.created").value(6))
			.andExpect(jsonPath("$.skipped").value(0));
		call(post("/api/admin/popups/{id}/slots/bulk", id).contentType(MediaType.APPLICATION_JSON).content(bulk.replace("2031-05-03", "2031-05-04")))
			.andExpect(jsonPath("$.created").value(2))
			.andExpect(jsonPath("$.skipped").value(6));
		call(get("/api/admin/popups/{id}/slots", id))
			.andExpect(jsonPath("$.length()").value(8))
			.andExpect(jsonPath("$[0].startsAt").value("2031-05-01T02:00:00Z"))
			.andExpect(jsonPath("$[0].endsAt").value("2031-05-01T02:40:00Z"));
		call(post("/api/admin/popups/{id}/slots/bulk", id).contentType(MediaType.APPLICATION_JSON).content(bulk.replace("2031-05-03", "2031-05-11")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("SLOT_OUTSIDE_PERIOD"));
	}

	@Test
	void capacityCannotDropBelowReservedAndBookedSlotsCannotBeDeleted() throws Exception {
		long id = createPopup("PUBLISHED", "2031-05-01", "2031-05-10");
		long slot = id(call(post("/api/admin/popups/{id}/slots", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"startsAt\":\"2031-05-02T15:00:00+09:00\",\"endsAt\":\"2031-05-02T16:00:00+09:00\",\"capacity\":10}")));
		jdbc.sql("update slots set reserved_count = 4 where id = ?").param(slot).update();

		call(patch("/api/admin/slots/{id}", slot).contentType(MediaType.APPLICATION_JSON).content("{\"capacity\":3}"))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("CAPACITY_BELOW_RESERVED"));
		call(patch("/api/admin/slots/{id}", slot).contentType(MediaType.APPLICATION_JSON).content("{\"capacity\":4}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.capacity").value(4))
			.andExpect(jsonPath("$.remaining").value(0));

		jdbc.sql("update slots set reserved_count = 0 where id = ?").param(slot).update();
		insertReservation(id, slot);
		call(delete("/api/admin/slots/{id}", slot)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SLOT_HAS_RESERVATIONS"));
		assertThat(audits("SLOT", slot, "SLOT_CAPACITY_CHANGED")).isEqualTo(1);
	}

	@Test
	void onlyEmptyDraftsCanBeDeleted() throws Exception {
		long published = createPopup("PUBLISHED", "2031-05-01", "2031-05-10");
		call(delete("/api/admin/popups/{id}", published)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("POPUP_NOT_DELETABLE"));
		long draft = createPopup("DRAFT", "2031-05-01", "2031-05-10");
		call(delete("/api/admin/popups/{id}", draft)).andExpect(status().isNoContent());
		call(get("/api/admin/popups/{id}", draft)).andExpect(status().isNotFound());
	}

	@Test
	void listFiltersAndPagesBeyondLastAreEmpty() throws Exception {
		createPopup("DRAFT", "2031-05-01", "2031-05-10");
		createPopup("PUBLISHED", "2031-05-01", "2031-05-10");
		call(get("/api/admin/popups").param("q", tag).param("status", "DRAFT"))
			.andExpect(jsonPath("$.totalItems").value(1))
			.andExpect(jsonPath("$.items[0].publishStatus").value("DRAFT"));
		call(get("/api/admin/popups").param("q", tag).param("size", "1").param("page", "1"))
			.andExpect(jsonPath("$.items.length()").value(1))
			.andExpect(jsonPath("$.totalPages").value(2));
		call(get("/api/admin/popups").param("q", tag).param("size", "1").param("page", "5"))
			.andExpect(jsonPath("$.items.length()").value(0))
			.andExpect(jsonPath("$.totalItems").value(2));
		call(get("/api/admin/popups").param("status", "BOGUS")).andExpect(status().isBadRequest());
	}

	@Test
	void draftSwitchWaitsForInFlightBookingThenRefuses() throws Exception {
		long id = createPopup("PUBLISHED", "2031-05-01", "2031-05-10");
		long slot = id(call(post("/api/admin/popups/{id}/slots", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"startsAt\":\"2031-05-02T15:00:00+09:00\",\"endsAt\":\"2031-05-02T16:00:00+09:00\",\"capacity\":10}")));
		String loadedAt = updatedAt(id);
		// Same locks as ReservationService.create: FOR SHARE on the popup, then take a seat and insert the booking.
		Future<Integer> admin = whileBookingInFlight("select id from popups where id = " + id + " for share", id, slot,
				() -> call(put("/api/admin/popups/{id}", id).contentType(MediaType.APPLICATION_JSON).content(form("DRAFT", "2031-05-01", "2031-05-10", loadedAt)))
					.andReturn().getResponse().getStatus());
		assertThat(admin.get(10, TimeUnit.SECONDS)).isEqualTo(409);
		call(get("/api/admin/popups/{id}", id)).andExpect(jsonPath("$.publishStatus").value("PUBLISHED"));
	}

	@Test
	void slotDeleteWaitsForInFlightBookingThenRefuses() throws Exception {
		long id = createPopup("PUBLISHED", "2031-05-01", "2031-05-10");
		long slot = id(call(post("/api/admin/popups/{id}/slots", id).contentType(MediaType.APPLICATION_JSON)
			.content("{\"startsAt\":\"2031-05-02T15:00:00+09:00\",\"endsAt\":\"2031-05-02T16:00:00+09:00\",\"capacity\":10}")));
		Future<Integer> admin = whileBookingInFlight("select id from popups where id = " + id + " for share", id, slot,
				() -> call(delete("/api/admin/slots/{id}", slot)).andReturn().getResponse().getStatus());
		assertThat(admin.get(10, TimeUnit.SECONDS)).isEqualTo(409);
	}

	/** Holds an uncommitted booking, starts the admin call, checks that it blocks, then commits the booking. */
	private Future<Integer> whileBookingInFlight(String popupLock, long popupId, long slotId, java.util.concurrent.Callable<Integer> adminCall)
			throws Exception {
		ExecutorService pool = Executors.newFixedThreadPool(2);
		CountDownLatch locked = new CountDownLatch(1);
		CountDownLatch release = new CountDownLatch(1);
		Future<?> booking = pool.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
			jdbc.sql(popupLock).query(Long.class).single();
			jdbc.sql("update slots set reserved_count = reserved_count + 1 where id = ?").param(slotId).update();
			insertReservation(popupId, slotId);
			locked.countDown();
			try {
				release.await();
			}
			catch (InterruptedException e) {
				Thread.currentThread().interrupt();
			}
		}));
		locked.await();
		Future<Integer> admin = pool.submit(adminCall);
		Thread.sleep(500);
		assertThat(admin.isDone()).as("admin change must wait for the in-flight booking").isFalse();
		release.countDown();
		booking.get(10, TimeUnit.SECONDS);
		pool.shutdown();
		return admin;
	}

	@Test
	void customersCannotManageCatalog() throws Exception {
		String customer = TestTokens.bearer(UUID.randomUUID());
		mvc.perform(get("/api/admin/popups").header("Authorization", customer)).andExpect(status().isForbidden());
		mvc.perform(post("/api/admin/popups").header("Authorization", customer).contentType(MediaType.APPLICATION_JSON)
			.content(form("DRAFT", "2031-05-01", "2031-05-10", null))).andExpect(status().isForbidden());
		mvc.perform(patch("/api/admin/slots/1").header("Authorization", customer).contentType(MediaType.APPLICATION_JSON).content("{\"capacity\":1}"))
			.andExpect(status().isForbidden());
	}

	private long createPopup(String status, String startsOn, String endsOn) throws Exception {
		return id(call(post("/api/admin/popups").contentType(MediaType.APPLICATION_JSON).content(form(status, startsOn, endsOn, null)))
			.andExpect(status().isCreated()));
	}

	private String form(String status, String startsOn, String endsOn, String expectedUpdatedAt) {
		return """
				{"title":"%s 관리 팝업","label":"Admin Pop","area":"성수","category":"테크","summary":"소개","description":"설명","notice":null,
				 "address":"서울","operatingHours":"11:00 — 20:00","visitMinutes":40,"artTheme":"blue","startsOn":"%s","endsOn":"%s",
				 "publishStatus":"%s","opensAt":"2031-04-25T14:00:00+09:00","closesAt":null,"manuallyClosed":false,"maxPartySize":4,
				 "cancelCutoffHours":24,"expectedUpdatedAt":%s}"""
			.formatted(tag, startsOn, endsOn, status, expectedUpdatedAt == null ? "null" : "\"" + expectedUpdatedAt + "\"");
	}

	private String updatedAt(long id) throws Exception {
		String body = call(get("/api/admin/popups/{id}", id)).andReturn().getResponse().getContentAsString();
		return body.split("\"updatedAt\":\"")[1].split("\"")[0];
	}

	private void insertReservation(long popupId, long slotId) {
		UUID someone = UUID.randomUUID();
		jdbc.sql("insert into app_users (id, email) values (?, 'r@example.com')").param(someone).update();
		jdbc.sql("""
				insert into reservations (code, user_id, popup_id, slot_id, party_size, contact_name, contact_phone, contact_email)
				values (?, ?, ?, ?, 1, '김팝업', '010-1234-5678', 'r@example.com')""")
			.params("PS-T-" + someone, someone, popupId, slotId)
			.update();
	}

	private int audits(String type, long id, String action) {
		return jdbc.sql("select count(*) from audit_logs where target_type = ? and target_id = ? and action = ?")
			.params(type, String.valueOf(id), action)
			.query(Integer.class)
			.single();
	}

	private ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request.header("Authorization", TestTokens.bearer(admin)));
	}

	private static long id(ResultActions result) throws Exception {
		String body = result.andReturn().getResponse().getContentAsString();
		return Long.parseLong(body.split("\"id\":")[1].split("[,}]")[0]);
	}

}
