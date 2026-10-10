package com.popspot.api.admin;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.popspot.api.admin.AdminCatalogViews.AdminPopup;
import com.popspot.api.admin.AdminCatalogViews.AdminPopupRow;
import com.popspot.api.admin.AdminCatalogViews.AdminSlot;
import com.popspot.api.admin.AdminCatalogViews.BulkResult;
import com.popspot.api.admin.AdminCatalogViews.BulkSlotForm;
import com.popspot.api.admin.AdminCatalogViews.PopupForm;
import com.popspot.api.admin.AdminCatalogViews.SlotForm;
import com.popspot.api.common.ApiException;
import com.popspot.api.common.PageResponse;
import com.popspot.api.popup.PopupQueries;

@Service
class AdminCatalogService {

	static final ZoneId KST = ZoneId.of("Asia/Seoul");

	/** Per-popup counters shown in admin lists; "active" excludes cancelled bookings. */
	private static final String COUNTERS = """
			(select count(*) from slots s2 where s2.popup_id = p.id) as slot_count,
			(select count(*) from reservations r where r.popup_id = p.id and r.status <> 'CANCELLED') as active_reservations
			""";

	private final JdbcClient jdbc;

	private final AuditLog audit;

	private final Clock clock;

	AdminCatalogService(JdbcClient jdbc, AuditLog audit, Clock clock) {
		this.jdbc = jdbc;
		this.audit = audit;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	PageResponse<AdminPopupRow> list(String q, String status, int page, int size) {
		Instant now = clock.instant();
		String filter = """
				 where (cast(:q as text) is null or position(lower(:q) in lower(p.title || ' ' || p.label)) > 0)
				   and (cast(:status as text) is null or p.publish_status = :status)""";
		var items = jdbc.sql(PopupQueries.POPUP_WITH_SEATS.replace("select p.*,", "select p.*, " + COUNTERS + ",") + " " + filter
				+ " order by p.updated_at desc, p.id desc limit :size offset :offset")
			.param("now", Timestamp.from(now))
			.param("q", q)
			.param("status", status)
			.param("size", size)
			.param("offset", (long) page * size)
			.query((rs, i) -> {
				var row = PopupQueries.popupRow(rs, i);
				return new AdminPopupRow(row.id(), row.title(), row.area(), row.category(), row.startsOn(), row.endsOn(), row.publishStatus(),
						row.status(now), row.opensAt(), rs.getInt("slot_count"), rs.getInt("active_reservations"), rs.getTimestamp("updated_at").toInstant());
			})
			.list();
		long total = jdbc.sql("select count(*) from popups p " + filter).param("q", q).param("status", status).query(Long.class).single();
		return PageResponse.of(items, page, size, total);
	}

	@Transactional(readOnly = true)
	AdminPopup get(long id) {
		Instant now = clock.instant();
		return jdbc.sql(PopupQueries.POPUP_WITH_SEATS.replace("select p.*,", "select p.*, " + COUNTERS + ",") + " where p.id = :id")
			.param("now", Timestamp.from(now))
			.param("id", id)
			.query((rs, i) -> {
				var row = PopupQueries.popupRow(rs, i);
				return new AdminPopup(row.id(), row.title(), row.label(), row.area(), row.category(), row.summary(), row.description(), row.notice(),
						row.address(), row.operatingHours(), row.visitMinutes(), row.artTheme(), row.startsOn(), row.endsOn(), row.publishStatus(),
						row.opensAt(), row.closesAt(), row.manuallyClosed(), row.maxPartySize(), row.cancelCutoffHours(), row.status(now),
						rs.getInt("slot_count"), rs.getInt("active_reservations"), rs.getTimestamp("updated_at").toInstant());
			})
			.optional()
			.orElseThrow(ApiException::notFound);
	}

	@Transactional
	AdminPopup create(UUID actor, PopupForm form) {
		validatePeriod(form);
		long id = jdbc.sql("""
				insert into popups (title, label, area, category, summary, description, notice, address, operating_hours, visit_minutes,
				                    art_theme, starts_on, ends_on, publish_status, opens_at, closes_at, manually_closed, max_party_size, cancel_cutoff_hours)
				values (:title, :label, :area, :category, :summary, :description, :notice, :address, :operatingHours, :visitMinutes,
				        :artTheme, :startsOn, :endsOn, :publishStatus, :opensAt, :closesAt, :manuallyClosed, :maxPartySize, :cancelCutoffHours)
				returning id""")
			.params(params(form))
			.query(Long.class)
			.single();
		audit.record(actor, "POPUP_CREATED", "POPUP", id, Map.of("title", form.title().trim(), "publishStatus", form.publishStatus()));
		return get(id);
	}

	@Transactional
	AdminPopup update(UUID actor, long id, PopupForm form) {
		if (form.expectedUpdatedAt() == null) {
			throw ApiException.badRequest("VALIDATION_FAILED", "수정 기준 시각(expectedUpdatedAt)이 필요합니다.");
		}
		validatePeriod(form);
		// Lock first, then read: in-flight bookings hold FOR SHARE on this row, so the checks below see every committed booking.
		lockPopup(id);
		AdminPopup current = get(id);
		if ("DRAFT".equals(form.publishStatus()) && !"DRAFT".equals(current.publishStatus()) && current.activeReservations() > 0) {
			throw ApiException.conflict("HAS_RESERVATIONS", "예약이 있는 팝업은 초안으로 되돌릴 수 없습니다.");
		}
		boolean slotsOutside = jdbc.sql("""
				select exists (select 1 from slots where popup_id = ?
				  and ((starts_at at time zone 'Asia/Seoul')::date < ? or (starts_at at time zone 'Asia/Seoul')::date > ?))""")
			.params(id, form.startsOn(), form.endsOn())
			.query(Boolean.class)
			.single();
		if (slotsOutside) {
			throw ApiException.conflict("SLOTS_OUTSIDE_PERIOD", "운영 기간 밖에 회차가 있습니다. 회차를 먼저 정리해 주세요.");
		}
		var params = params(form);
		params.put("id", id);
		params.put("expected", Timestamp.from(form.expectedUpdatedAt()));
		int updated = jdbc.sql("""
				update popups set title = :title, label = :label, area = :area, category = :category, summary = :summary,
				  description = :description, notice = :notice, address = :address, operating_hours = :operatingHours,
				  visit_minutes = :visitMinutes, art_theme = :artTheme, starts_on = :startsOn, ends_on = :endsOn,
				  publish_status = :publishStatus, opens_at = :opensAt, closes_at = :closesAt, manually_closed = :manuallyClosed,
				  max_party_size = :maxPartySize, cancel_cutoff_hours = :cancelCutoffHours, updated_at = clock_timestamp()
				where id = :id and updated_at = :expected""")
			.params(params)
			.update();
		if (updated == 0) {
			throw ApiException.conflict("STALE_UPDATE", "다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 시도해 주세요.");
		}
		var detail = new LinkedHashMap<String, Object>();
		detail.put("publishStatus", current.publishStatus() + "→" + form.publishStatus());
		detail.put("opensAt", form.opensAt().toInstant().toString());
		detail.put("manuallyClosed", form.manuallyClosed());
		audit.record(actor, "POPUP_UPDATED", "POPUP", id, detail);
		return get(id);
	}

	@Transactional
	void delete(UUID actor, long id) {
		lockPopup(id);
		AdminPopup current = get(id);
		if (!"DRAFT".equals(current.publishStatus()) || current.slotCount() > 0) {
			throw ApiException.conflict("POPUP_NOT_DELETABLE", "회차가 없는 초안만 삭제할 수 있습니다.");
		}
		jdbc.sql("delete from popups where id = ?").param(id).update();
		audit.record(actor, "POPUP_DELETED", "POPUP", id, Map.of("title", current.title()));
	}

	@Transactional(readOnly = true)
	List<AdminSlot> slots(long popupId) {
		get(popupId);
		return jdbc.sql("select id, starts_at, ends_at, capacity, reserved_count from slots where popup_id = ? order by starts_at")
			.param(popupId)
			.query((rs, i) -> slot(rs.getLong("id"), rs.getTimestamp("starts_at").toInstant(), rs.getTimestamp("ends_at").toInstant(),
					rs.getInt("capacity"), rs.getInt("reserved_count")))
			.list();
	}

	@Transactional
	AdminSlot createSlot(UUID actor, long popupId, SlotForm form) {
		AdminPopup popup = get(popupId);
		Instant start = form.startsAt().toInstant();
		Instant end = form.endsAt().toInstant();
		if (!end.isAfter(start)) {
			throw ApiException.badRequest("INVALID_PERIOD", "종료 시각은 시작 시각보다 늦어야 합니다.");
		}
		requireWithinPeriod(popup, start);
		long id;
		try {
			id = jdbc.sql("insert into slots (popup_id, starts_at, ends_at, capacity) values (?, ?, ?, ?) returning id")
				.params(popupId, Timestamp.from(start), Timestamp.from(end), form.capacity())
				.query(Long.class)
				.single();
		}
		catch (DuplicateKeyException e) {
			throw ApiException.conflict("SLOT_EXISTS", "같은 시작 시각의 회차가 이미 있습니다.");
		}
		audit.record(actor, "SLOT_CREATED", "SLOT", id, Map.of("popupId", popupId, "startsAt", start.toString(), "capacity", form.capacity()));
		return slot(id, start, end, form.capacity(), 0);
	}

	/** Creates daily KST sessions; starts that already exist are skipped rather than failing the batch. */
	@Transactional
	BulkResult createSlots(UUID actor, long popupId, BulkSlotForm form) {
		AdminPopup popup = get(popupId);
		if (form.toDate().isBefore(form.fromDate()) || ChronoUnit.DAYS.between(form.fromDate(), form.toDate()) > 62) {
			throw ApiException.badRequest("INVALID_PERIOD", "날짜 범위를 확인해 주세요. 최대 63일까지 한 번에 만들 수 있습니다.");
		}
		if (form.fromDate().isBefore(popup.startsOn()) || form.toDate().isAfter(popup.endsOn())) {
			throw ApiException.badRequest("SLOT_OUTSIDE_PERIOD", "회차는 팝업 운영 기간 안에서만 만들 수 있습니다.");
		}
		int created = 0;
		int total = 0;
		for (LocalDate day = form.fromDate(); !day.isAfter(form.toDate()); day = day.plusDays(1)) {
			for (String time : form.times().stream().distinct().toList()) {
				Instant start = day.atTime(LocalTime.parse(time)).atZone(KST).toInstant();
				Instant end = start.plusSeconds(form.durationMinutes() * 60L);
				total++;
				created += jdbc.sql("insert into slots (popup_id, starts_at, ends_at, capacity) values (?, ?, ?, ?) on conflict (popup_id, starts_at) do nothing")
					.params(popupId, Timestamp.from(start), Timestamp.from(end), form.capacity())
					.update();
			}
		}
		audit.record(actor, "SLOTS_BULK_CREATED", "POPUP", popupId,
				Map.of("from", form.fromDate().toString(), "to", form.toDate().toString(), "times", form.times(), "created", created));
		return new BulkResult(created, total - created);
	}

	/** The predicate makes the check atomic with concurrent bookings, which hold the same row lock. */
	@Transactional
	AdminSlot updateCapacity(UUID actor, long slotId, int capacity) {
		int updated = jdbc.sql("update slots set capacity = ? where id = ? and reserved_count <= ?").params(capacity, slotId, capacity).update();
		AdminSlot slot = findSlot(slotId);
		if (updated == 0) {
			throw ApiException.conflict("CAPACITY_BELOW_RESERVED", "예약 인원(" + slot.reserved() + "명)보다 정원을 작게 변경할 수 없습니다.");
		}
		audit.record(actor, "SLOT_CAPACITY_CHANGED", "SLOT", slotId, Map.of("capacity", capacity));
		return slot;
	}

	@Transactional
	void deleteSlot(UUID actor, long slotId) {
		// Bookings update the slot row, so this lock orders the reservation check after any in-flight booking.
		jdbc.sql("select id from slots where id = ? for update").param(slotId).query(Long.class).optional().orElseThrow(ApiException::notFound);
		AdminSlot slot = findSlot(slotId);
		boolean hasReservations = jdbc.sql("select exists (select 1 from reservations where slot_id = ?)").param(slotId).query(Boolean.class).single();
		if (hasReservations) {
			throw ApiException.conflict("SLOT_HAS_RESERVATIONS", "예약 이력이 있는 회차는 삭제할 수 없습니다.");
		}
		jdbc.sql("delete from slots where id = ?").param(slotId).update();
		audit.record(actor, "SLOT_DELETED", "SLOT", slotId, Map.of("startsAt", slot.startsAt().toString()));
	}

	private void lockPopup(long id) {
		jdbc.sql("select id from popups where id = ? for update").param(id).query(Long.class).optional().orElseThrow(ApiException::notFound);
	}

	private AdminSlot findSlot(long slotId) {
		return jdbc.sql("select id, starts_at, ends_at, capacity, reserved_count from slots where id = ?")
			.param(slotId)
			.query((rs, i) -> slot(rs.getLong("id"), rs.getTimestamp("starts_at").toInstant(), rs.getTimestamp("ends_at").toInstant(),
					rs.getInt("capacity"), rs.getInt("reserved_count")))
			.optional()
			.orElseThrow(ApiException::notFound);
	}

	private static void validatePeriod(PopupForm form) {
		if (form.startsOn().isAfter(form.endsOn())) {
			throw ApiException.badRequest("INVALID_PERIOD", "종료일은 시작일과 같거나 늦어야 합니다.");
		}
		if (form.closesAt() != null && !form.closesAt().isAfter(form.opensAt())) {
			throw ApiException.badRequest("INVALID_PERIOD", "예약 마감 일시는 오픈 일시보다 늦어야 합니다.");
		}
	}

	private static void requireWithinPeriod(AdminPopup popup, Instant start) {
		LocalDate day = start.atZone(KST).toLocalDate();
		if (day.isBefore(popup.startsOn()) || day.isAfter(popup.endsOn())) {
			throw ApiException.badRequest("SLOT_OUTSIDE_PERIOD", "회차는 팝업 운영 기간 안에서만 만들 수 있습니다.");
		}
	}

	private static AdminSlot slot(long id, Instant start, Instant end, int capacity, int reserved) {
		return new AdminSlot(id, start, end, capacity, reserved, capacity - reserved);
	}

	private static Map<String, Object> params(PopupForm f) {
		var p = new LinkedHashMap<String, Object>();
		p.put("title", f.title().trim());
		p.put("label", f.label().trim());
		p.put("area", f.area().trim());
		p.put("category", f.category().trim());
		p.put("summary", f.summary().trim());
		p.put("description", f.description());
		p.put("notice", f.notice() == null || f.notice().isBlank() ? null : f.notice().trim());
		p.put("address", f.address().trim());
		p.put("operatingHours", f.operatingHours().trim());
		p.put("visitMinutes", f.visitMinutes());
		p.put("artTheme", f.artTheme());
		p.put("startsOn", f.startsOn());
		p.put("endsOn", f.endsOn());
		p.put("publishStatus", f.publishStatus());
		p.put("opensAt", Timestamp.from(f.opensAt().toInstant()));
		p.put("closesAt", f.closesAt() == null ? null : Timestamp.from(f.closesAt().toInstant()));
		p.put("manuallyClosed", f.manuallyClosed());
		p.put("maxPartySize", f.maxPartySize());
		p.put("cancelCutoffHours", f.cancelCutoffHours());
		return p;
	}

}
