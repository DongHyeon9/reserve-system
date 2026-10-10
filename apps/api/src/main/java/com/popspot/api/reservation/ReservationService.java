package com.popspot.api.reservation;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.popspot.api.common.ApiException;
import com.popspot.api.reservation.ReservationViews.CreateReservationRequest;
import com.popspot.api.reservation.ReservationViews.ReservationView;

@Service
public class ReservationService {

	private static final String CREATE = "CREATE_RESERVATION";

	private final JdbcClient jdbc;

	private final ReservationQueries queries;

	private final Clock clock;

	ReservationService(JdbcClient jdbc, ReservationQueries queries, Clock clock) {
		this.jdbc = jdbc;
		this.queries = queries;
		this.clock = clock;
	}

	public record Created(ReservationView reservation, boolean replayed) {
	}

	private record Target(long popupId, Instant startsAt, String publishStatus, boolean manuallyClosed, Instant opensAt, Instant closesAt,
			int maxPartySize) {
	}

	/**
	 * Books seats atomically. Any business failure rolls back the whole transaction, including the idempotency claim, so
	 * a retry with the same key is evaluated again.
	 */
	@Transactional
	public Created create(UUID user, String idempotencyKey, CreateReservationRequest req) {
		if (idempotencyKey.length() < 8 || idempotencyKey.length() > 100) {
			throw ApiException.badRequest("IDEMPOTENCY_KEY_INVALID", "Idempotency-Key는 8~100자여야 합니다.");
		}
		String fingerprint = req.fingerprint();
		// A concurrent request with the same key blocks here until the first one commits, then sees its row.
		int claimed = jdbc.sql("insert into idempotency_keys (user_id, operation, idem_key, request_hash) values (?, ?, ?, ?) on conflict do nothing")
			.params(user, CREATE, idempotencyKey, fingerprint)
			.update();
		Instant now = clock.instant();
		if (claimed == 0) {
			return replay(user, idempotencyKey, fingerprint, now);
		}

		Target target = jdbc.sql("""
				select s.popup_id, s.starts_at, p.publish_status, p.manually_closed, p.opens_at, p.closes_at, p.max_party_size
				from slots s join popups p on p.id = s.popup_id
				where s.id = ? and p.publish_status <> 'DRAFT'""")
			.param(req.slotId())
			.query((rs, i) -> new Target(rs.getLong("popup_id"), ReservationQueries.instant(rs, "starts_at"), rs.getString("publish_status"),
					rs.getBoolean("manually_closed"), ReservationQueries.instant(rs, "opens_at"), ReservationQueries.instant(rs, "closes_at"),
					rs.getInt("max_party_size")))
			.optional()
			.orElseThrow(ApiException::notFound);

		boolean open = "PUBLISHED".equals(target.publishStatus()) && !target.manuallyClosed() && !now.isBefore(target.opensAt())
				&& (target.closesAt() == null || now.isBefore(target.closesAt()));
		if (!open) {
			throw ApiException.conflict("RESERVATION_NOT_OPEN", "지금은 예약할 수 없는 팝업입니다.");
		}
		if (!target.startsAt().isAfter(now)) {
			throw ApiException.conflict("SLOT_UNAVAILABLE", "이미 시작된 회차는 예약할 수 없습니다.");
		}
		if (req.partySize() > target.maxPartySize()) {
			throw ApiException.badRequest("PARTY_SIZE_EXCEEDED", "최대 " + target.maxPartySize() + "명까지 예약할 수 있습니다.");
		}
		boolean alreadyBooked = jdbc.sql("select exists (select 1 from reservations where user_id = ? and slot_id = ? and status <> 'CANCELLED')")
			.params(user, req.slotId())
			.query(Boolean.class)
			.single();
		if (alreadyBooked) {
			throw duplicate();
		}

		// Conditional increment: the row lock serializes bookings per slot and the predicate makes overbooking impossible.
		int seated = jdbc.sql("update slots set reserved_count = reserved_count + :n where id = :id and reserved_count + :n <= capacity")
			.param("n", req.partySize())
			.param("id", req.slotId())
			.update();
		if (seated == 0) {
			throw ApiException.conflict("SOLD_OUT", "선택한 회차의 잔여석이 부족합니다.");
		}

		UUID id;
		try {
			id = jdbc.sql("""
					insert into reservations (code, user_id, popup_id, slot_id, party_size, contact_name, contact_phone, contact_email, created_at)
					values ('PS-' || to_char(cast(? as timestamptz) at time zone 'Asia/Seoul', 'YYMMDD') || '-' || lpad(nextval('reservation_code_seq')::text, 4, '0'),
					        ?, ?, ?, ?, ?, ?, ?, ?)
					returning id""")
				.params(Timestamp.from(target.startsAt()), user, target.popupId(), req.slotId(), req.partySize(), req.contactName().trim(),
						req.contactPhone().trim(), req.contactEmail().trim(), Timestamp.from(now))
				.query(UUID.class)
				.single();
		}
		catch (DuplicateKeyException e) {
			// Same user racing with a different key: the partial unique index is the final guard.
			throw duplicate();
		}
		jdbc.sql("insert into reservation_events (reservation_id, type, actor_id, actor_role, occurred_at) values (?, 'CREATED', ?, 'CUSTOMER', ?)")
			.params(id, user, Timestamp.from(now))
			.update();
		jdbc.sql("update idempotency_keys set reservation_id = ? where user_id = ? and operation = ? and idem_key = ?")
			.params(id, user, CREATE, idempotencyKey)
			.update();
		return new Created(queries.findOwned(id, user, now).orElseThrow(), false);
	}

	private Created replay(UUID user, String key, String fingerprint, Instant now) {
		record Prior(String requestHash, UUID reservationId) {
		}
		Prior prior = jdbc.sql("select request_hash, reservation_id from idempotency_keys where user_id = ? and operation = ? and idem_key = ?")
			.params(user, CREATE, key)
			.query((rs, i) -> new Prior(rs.getString("request_hash"), rs.getObject("reservation_id", UUID.class)))
			.single();
		if (!prior.requestHash().equals(fingerprint)) {
			throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "IDEMPOTENCY_KEY_REUSED", "같은 요청 키로 다른 예약을 요청할 수 없습니다.");
		}
		return new Created(queries.findOwned(prior.reservationId(), user, now).orElseThrow(ApiException::notFound), true);
	}

	@Transactional(readOnly = true)
	public ReservationView get(UUID user, UUID id) {
		return queries.findOwned(id, user, clock.instant()).orElseThrow(ApiException::notFound);
	}

	private static ApiException duplicate() {
		return ApiException.conflict("DUPLICATE_RESERVATION", "이미 같은 회차를 예약했습니다.");
	}

}
