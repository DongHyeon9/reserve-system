package com.popspot.api.admin;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Operations overview. Access is restricted to ADMIN by the /api/admin/** rule in SecurityConfig. */
@RestController
class AdminDashboardController {

	static final ZoneId KST = ZoneId.of("Asia/Seoul");

	private final JdbcClient jdbc;

	private final Clock clock;

	AdminDashboardController(JdbcClient jdbc, Clock clock) {
		this.jdbc = jdbc;
		this.clock = clock;
	}

	record Kpis(long todayReservations, long yesterdayReservations, Double reservationDeltaPercent, long todayVisits, long expectedVisits,
			Double checkInRatePercent, long todaySlots, long soldOutSlots, long todayCancellations, Double cancelRatePercent) {
	}

	record SlotRow(long slotId, long popupId, String popupTitle, Instant startsAt, int capacity, int reserved) {
	}

	record Alert(String type, long popupId, String popupTitle, Long slotId, Instant at, Integer remaining) {
	}

	record Dashboard(LocalDate date, Instant serverTime, Kpis kpis, List<SlotRow> todaySlots, List<Alert> alerts) {
	}

	@GetMapping("/api/admin/dashboard")
	@Transactional(readOnly = true)
	Dashboard dashboard() {
		Instant now = clock.instant();
		LocalDate today = now.atZone(KST).toLocalDate();
		Timestamp start = Timestamp.from(today.atStartOfDay(KST).toInstant());
		Timestamp end = Timestamp.from(today.plusDays(1).atStartOfDay(KST).toInstant());
		Timestamp yesterday = Timestamp.from(today.minusDays(1).atStartOfDay(KST).toInstant());

		var counts = jdbc.sql("""
				select
				  (select count(*) from reservations where created_at >= :start and created_at < :end) as today_res,
				  (select count(*) from reservations where created_at >= :yesterday and created_at < :start) as yesterday_res,
				  (select count(*) from reservations where cancelled_at >= :start and cancelled_at < :end) as today_cancel,
				  (select count(*) filter (where r.status = 'CHECKED_IN') from reservations r join slots s on s.id = r.slot_id
				     where s.starts_at >= :start and s.starts_at < :end) as visits,
				  (select count(*) filter (where r.status <> 'CANCELLED') from reservations r join slots s on s.id = r.slot_id
				     where s.starts_at >= :start and s.starts_at < :end) as expected,
				  (select count(*) from slots where starts_at >= :start and starts_at < :end) as slots,
				  (select count(*) from slots where starts_at >= :start and starts_at < :end and reserved_count = capacity) as sold_out""")
			.param("start", start)
			.param("end", end)
			.param("yesterday", yesterday)
			.query((rs, i) -> new long[] { rs.getLong("today_res"), rs.getLong("yesterday_res"), rs.getLong("today_cancel"), rs.getLong("visits"),
					rs.getLong("expected"), rs.getLong("slots"), rs.getLong("sold_out") })
			.single();
		long todayRes = counts[0], yesterdayRes = counts[1], cancels = counts[2], visits = counts[3], expected = counts[4];
		var kpis = new Kpis(todayRes, yesterdayRes, percent(todayRes - yesterdayRes, yesterdayRes), visits, expected, percent(visits, expected),
				counts[5], counts[6], cancels, percent(cancels, todayRes));

		var slots = jdbc.sql("""
				select s.id, s.popup_id, p.title, s.starts_at, s.capacity, s.reserved_count
				from slots s join popups p on p.id = s.popup_id
				where s.starts_at >= :start and s.starts_at < :end
				order by s.starts_at, p.title""")
			.param("start", start)
			.param("end", end)
			.query((rs, i) -> new SlotRow(rs.getLong("id"), rs.getLong("popup_id"), rs.getString("title"), rs.getTimestamp("starts_at").toInstant(),
					rs.getInt("capacity"), rs.getInt("reserved_count")))
			.list();

		return new Dashboard(today, now, kpis, slots, alerts(now, end));
	}

	/** Upcoming slots today with at most 20% (min 1) seats left, then published popups opening within a week. */
	private List<Alert> alerts(Instant now, Timestamp end) {
		var nearlyFull = jdbc.sql("""
				select s.id, s.popup_id, p.title, s.starts_at, s.capacity - s.reserved_count as remaining
				from slots s join popups p on p.id = s.popup_id
				where s.starts_at > :now and s.starts_at < :end
				  and s.reserved_count < s.capacity
				  and s.capacity - s.reserved_count <= greatest(1, s.capacity / 5)
				order by s.starts_at limit 10""")
			.param("now", Timestamp.from(now))
			.param("end", end)
			.query((rs, i) -> new Alert("SLOT_NEARLY_FULL", rs.getLong("popup_id"), rs.getString("title"), rs.getLong("id"),
					rs.getTimestamp("starts_at").toInstant(), rs.getInt("remaining")))
			.list();
		var openingSoon = jdbc.sql("""
				select id, title, opens_at from popups
				where publish_status = 'PUBLISHED' and not manually_closed and opens_at > :now and opens_at <= :horizon
				order by opens_at limit 10""")
			.param("now", Timestamp.from(now))
			.param("horizon", Timestamp.from(now.plus(Duration.ofDays(7))))
			.query((rs, i) -> new Alert("OPENING_SOON", rs.getLong("id"), rs.getString("title"), null, rs.getTimestamp("opens_at").toInstant(), null))
			.list();
		return java.util.stream.Stream.concat(nearlyFull.stream(), openingSoon.stream()).toList();
	}

	private static Double percent(long part, long whole) {
		return whole == 0 ? null : Math.round(part * 1000.0 / whole) / 10.0;
	}

}
