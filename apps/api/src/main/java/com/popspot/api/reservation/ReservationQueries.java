package com.popspot.api.reservation;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
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
