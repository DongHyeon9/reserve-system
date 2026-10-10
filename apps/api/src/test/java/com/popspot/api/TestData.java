package com.popspot.api;

import java.sql.Timestamp;
import java.time.Instant;

import org.springframework.jdbc.core.simple.JdbcClient;

/** Inserts popups and slots directly for API tests. */
public final class TestData {

	private TestData() {
	}

	public static long popup(JdbcClient jdbc, String title, String publishStatus, Instant opensAt) {
		return jdbc.sql("""
				insert into popups (title, label, area, category, summary, description, address, operating_hours, visit_minutes,
				                    starts_on, ends_on, publish_status, opens_at)
				values (?, ?, '성수', '테크', '한 줄 소개', '공간 소개', '서울 성동구 연무장길 42', '11:00 — 20:00', 40,
				        '2026-11-01', '2026-11-17', ?, ?)
				returning id""")
			.params(title, title.length() > 40 ? title.substring(0, 40) : title, publishStatus, Timestamp.from(opensAt))
			.query(Long.class)
			.single();
	}

	public static long slot(JdbcClient jdbc, long popupId, Instant startsAt, int capacity, int reserved) {
		return jdbc.sql("insert into slots (popup_id, starts_at, ends_at, capacity, reserved_count) values (?, ?, ?, ?, ?) returning id")
			.params(popupId, Timestamp.from(startsAt), Timestamp.from(startsAt.plusSeconds(3600)), capacity, reserved)
			.query(Long.class)
			.single();
	}

}
