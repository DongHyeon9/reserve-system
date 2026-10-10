package com.popspot.api.admin;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.popspot.api.common.ApiException;
import com.popspot.api.common.PageResponse;
import com.popspot.api.reservation.ReservationViews;

/** Operator view of reservations. Contact data is masked by default; full values are released only through {@link #revealContact}. */
@Service
class AdminReservationService {

	static final ZoneId KST = ZoneId.of("Asia/Seoul");

	private static final String BASE = """
			select r.id, r.code, r.status, r.popup_id, p.title, p.address, s.starts_at, s.ends_at, r.party_size, r.contact_name,
			       r.contact_phone, r.contact_email, r.created_at, r.cancelled_at, r.checked_in_at
			from reservations r
			join popups p on p.id = r.popup_id
			join slots s on s.id = r.slot_id
			""";

	private static final String FILTER = """
			where (cast(:q as text) is null
			       or starts_with(upper(r.code), upper(:q))
			       or position(lower(:q) in lower(r.contact_name)) > 0
			       or (cast(:digits as text) is not null and right(regexp_replace(r.contact_phone, '[^0-9]', '', 'g'), length(:digits)) = :digits))
			  and (cast(:popupId as bigint) is null or r.popup_id = :popupId)
			  and (cast(:date as date) is null or (s.starts_at at time zone 'Asia/Seoul')::date = cast(:date as date))
			  and (cast(:status as text) is null or r.status = :status)
			""";

	private final JdbcClient jdbc;

	private final AuditLog audit;

	private final Clock clock;

	AdminReservationService(JdbcClient jdbc, AuditLog audit, Clock clock) {
		this.jdbc = jdbc;
		this.audit = audit;
		this.clock = clock;
	}

	record Row(UUID id, String code, String status, long popupId, String popupTitle, Instant slotStartsAt, int partySize, String contactName,
			String contactPhoneMasked, Instant createdAt) {
	}

	record Event(String type, String actorRole, Instant occurredAt) {
	}

	record Detail(UUID id, String code, String status, long popupId, String popupTitle, Instant slotStartsAt, Instant slotEndsAt, String popupAddress,
			int partySize, String contactName, String contactPhoneMasked, String contactEmailMasked, Instant createdAt, Instant cancelledAt,
			Instant checkedInAt, boolean canCancel, boolean canCheckIn, List<Event> events) {
	}

	record Contact(String contactPhone, String contactEmail) {
	}

	@Transactional(readOnly = true)
	PageResponse<Row> search(String q, Long popupId, LocalDate date, String status, int page, int size) {
		String digits = q != null && q.matches("\\d{4,}") ? q : null;
		var items = jdbc.sql(BASE + " " + FILTER + " order by s.starts_at, r.code limit :size offset :offset")
			.param("q", q)
			.param("digits", digits)
			.param("popupId", popupId)
			.param("date", date)
			.param("status", status)
			.param("size", size)
			.param("offset", (long) page * size)
			.query((rs, i) -> new Row(rs.getObject("id", UUID.class), rs.getString("code"), rs.getString("status"), rs.getLong("popup_id"),
					rs.getString("title"), instant(rs, "starts_at"), rs.getInt("party_size"), rs.getString("contact_name"),
					ReservationViews.maskPhone(rs.getString("contact_phone")), instant(rs, "created_at")))
			.list();
		long total = jdbc.sql("select count(*) from reservations r join slots s on s.id = r.slot_id " + FILTER)
			.param("q", q)
			.param("digits", digits)
			.param("popupId", popupId)
			.param("date", date)
			.param("status", status)
			.query(Long.class)
			.single();
		return PageResponse.of(items, page, size, total);
	}

	@Transactional(readOnly = true)
	Detail get(UUID id) {
		LocalDate today = clock.instant().atZone(KST).toLocalDate();
		var events = jdbc.sql("select type, actor_role, occurred_at from reservation_events where reservation_id = ? order by occurred_at, id")
			.param(id)
			.query((rs, i) -> new Event(rs.getString("type"), rs.getString("actor_role"), instant(rs, "occurred_at")))
			.list();
		return jdbc.sql(BASE + " where r.id = ?")
			.param(id)
			.query((rs, i) -> {
				String status = rs.getString("status");
				Instant startsAt = instant(rs, "starts_at");
				boolean confirmed = "CONFIRMED".equals(status);
				return new Detail(rs.getObject("id", UUID.class), rs.getString("code"), status, rs.getLong("popup_id"), rs.getString("title"),
						startsAt, instant(rs, "ends_at"), rs.getString("address"), rs.getInt("party_size"), rs.getString("contact_name"),
						ReservationViews.maskPhone(rs.getString("contact_phone")), ReservationViews.maskEmail(rs.getString("contact_email")),
						instant(rs, "created_at"), instant(rs, "cancelled_at"), instant(rs, "checked_in_at"), confirmed,
						confirmed && startsAt.atZone(KST).toLocalDate().equals(today), events);
			})
			.optional()
			.orElseThrow(ApiException::notFound);
	}

	/** Every reveal is audited with who and when; the values themselves never go into the log. */
	@Transactional
	Contact revealContact(UUID actor, UUID id) {
		Contact contact = jdbc.sql("select contact_phone, contact_email from reservations where id = ?")
			.param(id)
			.query((rs, i) -> new Contact(rs.getString("contact_phone"), rs.getString("contact_email")))
			.optional()
			.orElseThrow(ApiException::notFound);
		audit.record(actor, "CONTACT_REVEALED", "RESERVATION", id, Map.of());
		return contact;
	}

	/**
	 * Operators may cancel any CONFIRMED booking regardless of the customer deadline. The conditional update makes this
	 * race-safe with a concurrent customer cancel: only one flips the row and returns the seats.
	 */
	@Transactional
	Detail cancel(UUID actor, UUID id, String reason) {
		Instant now = clock.instant();
		record Released(long slotId, int partySize) {
		}
		var released = jdbc.sql("update reservations set status = 'CANCELLED', cancelled_at = ? where id = ? and status = 'CONFIRMED' returning slot_id, party_size")
			.params(Timestamp.from(now), id)
			.query((rs, i) -> new Released(rs.getLong("slot_id"), rs.getInt("party_size")))
			.optional();
		if (released.isPresent()) {
			jdbc.sql("update slots set reserved_count = reserved_count - ? where id = ?").params(released.get().partySize(), released.get().slotId()).update();
			event(id, "CANCELLED", actor, now);
			// The free-text reason is required as a deliberate step but never stored: operators may type contact details into it.
			audit.record(actor, "RESERVATION_CANCELLED", "RESERVATION", id, Map.of("reasonLength", reason.trim().length()));
			return get(id);
		}
		Detail current = get(id);
		if ("CHECKED_IN".equals(current.status())) {
			throw ApiException.conflict("NOT_CANCELLABLE", "체크인된 예약은 취소할 수 없습니다.");
		}
		return current;
	}

	/** Check-in is allowed only on the visit date in KST, decided by the server clock. Repeating it is a no-op. */
	@Transactional
	Detail checkIn(UUID actor, UUID id) {
		Instant now = clock.instant();
		LocalDate today = now.atZone(KST).toLocalDate();
		int updated = jdbc.sql("""
				update reservations r set status = 'CHECKED_IN', checked_in_at = :now
				from slots s
				where r.id = :id and r.status = 'CONFIRMED' and s.id = r.slot_id
				  and (s.starts_at at time zone 'Asia/Seoul')::date = :today""")
			.param("now", Timestamp.from(now))
			.param("id", id)
			.param("today", today)
			.update();
		if (updated == 1) {
			event(id, "CHECKED_IN", actor, now);
			audit.record(actor, "RESERVATION_CHECKED_IN", "RESERVATION", id, Map.of());
			return get(id);
		}
		Detail current = get(id);
		return switch (current.status()) {
			case "CHECKED_IN" -> current;
			case "CANCELLED" -> throw ApiException.conflict("NOT_CHECKINABLE", "취소된 예약은 체크인할 수 없습니다.");
			default -> throw ApiException.conflict("CHECK_IN_NOT_TODAY", "체크인은 방문 당일에만 가능합니다.");
		};
	}

	private void event(UUID id, String type, UUID actor, Instant at) {
		jdbc.sql("insert into reservation_events (reservation_id, type, actor_id, actor_role, occurred_at) values (?, ?, ?, 'ADMIN', ?)")
			.params(id, type, actor, Timestamp.from(at))
			.update();
	}

	private static Instant instant(ResultSet rs, String column) throws SQLException {
		Timestamp ts = rs.getTimestamp(column);
		return ts == null ? null : ts.toInstant();
	}

}
