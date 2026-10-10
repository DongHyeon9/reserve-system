package com.popspot.api.reservation;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.popspot.api.reservation.ReservationViews.PopupRef;
import com.popspot.api.reservation.ReservationViews.ReservationView;
import com.popspot.api.reservation.ReservationViews.SlotRef;

@Repository
class ReservationQueries {

	static final String VIEW = """
			select r.id, r.code, r.status, r.party_size, r.contact_name, r.contact_phone, r.contact_email, r.created_at, r.cancelled_at,
			       p.id as popup_id, p.title, p.label, p.area, p.address, p.art_theme, p.cancel_cutoff_hours,
			       s.id as slot_id, s.starts_at, s.ends_at
			from reservations r
			join popups p on p.id = r.popup_id
			join slots s on s.id = r.slot_id
			""";

	private final JdbcClient jdbc;

	ReservationQueries(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	/** Owner-scoped lookup: another user's reservation is indistinguishable from a missing one. */
	Optional<ReservationView> findOwned(UUID id, UUID user, Instant now) {
		return jdbc.sql(VIEW + " where r.id = ? and r.user_id = ?").params(id, user).query((rs, i) -> view(rs, now)).optional();
	}

	enum Tab {

		UPCOMING("r.status <> 'CANCELLED' and s.ends_at > :now", "s.starts_at, r.id"),
		PAST("r.status <> 'CANCELLED' and s.ends_at <= :now", "s.starts_at desc, r.id"),
		CANCELLED("r.status = 'CANCELLED'", "r.cancelled_at desc, r.id");

		final String where;

		final String order;

		Tab(String where, String order) {
			this.where = where;
			this.order = order;
		}

	}

	record Counts(long upcoming, long past, long cancelled) {
	}

	List<ReservationView> list(UUID user, Tab tab, int page, int size, Instant now) {
		return jdbc.sql(VIEW + " where r.user_id = :user and " + tab.where + " order by " + tab.order + " limit :size offset :offset")
			.param("user", user)
			.param("now", Timestamp.from(now))
			.param("size", size)
			.param("offset", (long) page * size)
			.query((rs, i) -> view(rs, now))
			.list();
	}

	Counts counts(UUID user, Instant now) {
		return jdbc.sql("""
				select count(*) filter (where %s) as upcoming,
				       count(*) filter (where %s) as past,
				       count(*) filter (where %s) as cancelled
				from reservations r join slots s on s.id = r.slot_id
				where r.user_id = :user""".formatted(Tab.UPCOMING.where, Tab.PAST.where, Tab.CANCELLED.where))
			.param("user", user)
			.param("now", Timestamp.from(now))
			.query((rs, i) -> new Counts(rs.getLong("upcoming"), rs.getLong("past"), rs.getLong("cancelled")))
			.single();
	}

	static ReservationView view(ResultSet rs, Instant now) throws SQLException {
		Instant startsAt = instant(rs, "starts_at");
		Instant cancellableUntil = startsAt.minus(Duration.ofHours(rs.getInt("cancel_cutoff_hours")));
		String status = rs.getString("status");
		return new ReservationView(rs.getObject("id", UUID.class), rs.getString("code"), status,
				new PopupRef(rs.getLong("popup_id"), rs.getString("title"), rs.getString("label"), rs.getString("area"), rs.getString("address"),
						rs.getString("art_theme")),
				new SlotRef(rs.getLong("slot_id"), startsAt, instant(rs, "ends_at")), rs.getInt("party_size"), rs.getString("contact_name"),
				ReservationViews.maskPhone(rs.getString("contact_phone")), rs.getString("contact_email"), instant(rs, "created_at"),
				instant(rs, "cancelled_at"), cancellableUntil, "CONFIRMED".equals(status) && now.isBefore(cancellableUntil));
	}

	static Instant instant(ResultSet rs, String column) throws SQLException {
		Timestamp ts = rs.getTimestamp(column);
		return ts == null ? null : ts.toInstant();
	}

}
