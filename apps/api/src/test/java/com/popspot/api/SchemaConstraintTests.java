package com.popspot.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SchemaConstraintTests {

	@Autowired
	JdbcClient jdbc;

	UUID user = UUID.randomUUID();
	long slot;

	@BeforeEach
	void seed() {
		jdbc.sql("insert into app_users (id, email) values (?, 'a@example.com')").param(user).update();
		long popup = jdbc.sql("""
				insert into popups (title, label, area, category, summary, address, operating_hours, visit_minutes, starts_on, ends_on, opens_at)
				values ('t', 'T', '성수', '테크', 's', 'addr', '11-20', 40, '2026-11-01', '2026-11-17', '2026-10-20T05:00:00Z') returning id""")
			.query(Long.class).single();
		slot = jdbc.sql("insert into slots (popup_id, starts_at, ends_at, capacity) values (?, '2026-11-01T02:00:00Z', '2026-11-01T03:00:00Z', 2) returning id")
			.param(popup).query(Long.class).single();
	}

	@Test
	void reservedCountCannotExceedCapacity() {
		assertThat(jdbc.sql("update slots set reserved_count = 2 where id = ?").param(slot).update()).isEqualTo(1);
		assertThatThrownBy(() -> jdbc.sql("update slots set reserved_count = 3 where id = ?").param(slot).update())
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void slotMustEndAfterStart() {
		assertThatThrownBy(() -> jdbc.sql("update slots set ends_at = starts_at where id = ?").param(slot).update())
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void oneActiveReservationPerUserAndSlot() {
		insertReservation("PS-1", "CONFIRMED");
		assertThatThrownBy(() -> insertReservation("PS-2", "CONFIRMED")).isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void cancelledReservationDoesNotBlockRebooking() {
		insertReservation("PS-1", "CANCELLED");
		insertReservation("PS-2", "CONFIRMED");
	}

	@Test
	void popupClosesAfterItOpens() {
		assertThatThrownBy(() -> jdbc.sql("update popups set closes_at = opens_at").update())
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void onlyOneOperationTestRunsAtATime() {
		String run = "insert into operation_test_runs (scenario, virtual_users, duration_seconds, status, started_by, expires_at) values ('LOAD', 10, 30, 'RUNNING', ?, now())";
		jdbc.sql(run).param(user).update();
		assertThatThrownBy(() -> jdbc.sql(run).param(user).update()).isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void operationTestLimitsAreEnforced() {
		assertThatThrownBy(() -> jdbc.sql("insert into operation_test_runs (scenario, virtual_users, duration_seconds, status, started_by, expires_at) values ('LOAD', 101, 30, 'STOPPED', ?, now())")
			.param(user).update()).isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void reservationPopupMustMatchItsSlot() {
		long otherPopup = jdbc.sql("""
				insert into popups (title, label, area, category, summary, address, operating_hours, visit_minutes, starts_on, ends_on, opens_at)
				values ('o', 'O', '성수', '테크', 's', 'addr', '11-20', 40, '2026-11-01', '2026-11-17', '2026-10-20T05:00:00Z') returning id""")
			.query(Long.class).single();
		assertThatThrownBy(() -> jdbc.sql("""
				insert into reservations (code, user_id, popup_id, slot_id, party_size, contact_name, contact_phone, contact_email)
				values ('PS-X', ?, ?, ?, 1, '김팝업', '010-1234-5678', 'a@example.com')""").params(user, otherPopup, slot).update())
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	private void insertReservation(String code, String status) {
		jdbc.sql("""
				insert into reservations (code, user_id, popup_id, slot_id, party_size, contact_name, contact_phone, contact_email, status, cancelled_at)
				select ?, ?, popup_id, id, 1, '김팝업', '010-1234-5678', 'a@example.com', ?, case when ? = 'CANCELLED' then now() end from slots where id = ?""")
			.params(code, user, status, status, slot).update();
	}

}
