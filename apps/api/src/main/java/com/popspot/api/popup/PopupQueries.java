package com.popspot.api.popup;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.popspot.api.popup.PopupViews.SlotView;

@Repository
public class PopupQueries {

	/** Popup columns plus future-slot aggregates needed to derive {@link ReservationStatus}. */
	public static final String POPUP_WITH_SEATS = """
			select p.*,
			       coalesce(agg.future_slots, 0) as future_slots,
			       coalesce(agg.future_with_seats, 0) as future_with_seats,
			       coalesce(agg.remaining, 0) as remaining
			from popups p
			left join lateral (
			    select count(*) as future_slots,
			           count(*) filter (where s.reserved_count < s.capacity) as future_with_seats,
			           sum(s.capacity - s.reserved_count) as remaining
			    from slots s
			    where s.popup_id = p.id and s.starts_at > :now
			) agg on true
			""";

	private static final String FILTER = """
			where p.publish_status = 'PUBLISHED' and not p.synthetic
			  and (cast(:q as text) is null or position(lower(:q) in lower(p.title || ' ' || p.label)) > 0)
			  and (cast(:area as text) is null or p.area = :area)
			  and (cast(:category as text) is null or p.category = :category)
			""";

	private final JdbcClient jdbc;

	PopupQueries(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	public record PopupRow(long id, String title, String label, String area, String category, String artTheme, LocalDate startsOn,
			LocalDate endsOn, String publishStatus, Instant opensAt, Instant closesAt, boolean manuallyClosed, String summary,
			String description, String notice, String address, String operatingHours, int visitMinutes, int maxPartySize,
			int cancelCutoffHours, int futureSlots, int futureWithSeats, int remaining) {

		public ReservationStatus status(Instant now) {
			return ReservationStatus.resolve(publishStatus, manuallyClosed, opensAt, closesAt, futureSlots, futureWithSeats, now);
		}

	}

	public List<PopupRow> search(String q, String area, String category, int page, int size, Instant now) {
		return jdbc.sql(POPUP_WITH_SEATS + FILTER + " order by p.starts_on, p.id limit :size offset :offset")
			.param("now", Timestamp.from(now))
			.param("q", q)
			.param("area", area)
			.param("category", category)
			.param("size", size)
			.param("offset", (long) page * size)
			.query(PopupQueries::popupRow)
			.list();
	}

	public long count(String q, String area, String category) {
		return jdbc.sql("select count(*) from popups p " + FILTER)
			.param("q", q)
			.param("area", area)
			.param("category", category)
			.query(Long.class)
			.single();
	}

	/** Drafts are invisible to customers; ended popups stay reachable from old links and show as CLOSED. */
	public Optional<PopupRow> findVisible(long id, Instant now) {
		return jdbc.sql(POPUP_WITH_SEATS + " where p.id = :id and p.publish_status <> 'DRAFT' and not p.synthetic")
			.param("now", Timestamp.from(now))
			.param("id", id)
			.query(PopupQueries::popupRow)
			.optional();
	}

	public List<SlotRow> futureSlots(long popupId, Instant now) {
		return jdbc.sql("select id, starts_at, ends_at, capacity, reserved_count from slots where popup_id = ? and starts_at > ? order by starts_at")
			.params(popupId, Timestamp.from(now))
			.query((rs, i) -> new SlotRow(rs.getLong("id"), instant(rs, "starts_at"), instant(rs, "ends_at"), rs.getInt("capacity"),
					rs.getInt("reserved_count")))
			.list();
	}

	public record SlotRow(long id, Instant startsAt, Instant endsAt, int capacity, int reservedCount) {

		SlotView view(boolean open) {
			int remaining = capacity - reservedCount;
			return new SlotView(id, startsAt, endsAt, capacity, remaining, open && remaining > 0);
		}

	}

	public List<String> distinctPublished(String column) {
		if (!column.equals("area") && !column.equals("category")) {
			throw new IllegalArgumentException(column);
		}
		return jdbc.sql("select distinct " + column + " from popups where publish_status = 'PUBLISHED' and not synthetic order by 1").query(String.class).list();
	}

	public static PopupRow popupRow(ResultSet rs, int rowNum) throws SQLException {
		return new PopupRow(rs.getLong("id"), rs.getString("title"), rs.getString("label"), rs.getString("area"), rs.getString("category"),
				rs.getString("art_theme"), rs.getObject("starts_on", LocalDate.class), rs.getObject("ends_on", LocalDate.class),
				rs.getString("publish_status"), instant(rs, "opens_at"), instant(rs, "closes_at"), rs.getBoolean("manually_closed"),
				rs.getString("summary"), rs.getString("description"), rs.getString("notice"), rs.getString("address"),
				rs.getString("operating_hours"), rs.getInt("visit_minutes"), rs.getInt("max_party_size"), rs.getInt("cancel_cutoff_hours"),
				rs.getInt("future_slots"), rs.getInt("future_with_seats"), rs.getInt("remaining"));
	}

	static Instant instant(ResultSet rs, String column) throws SQLException {
		Timestamp ts = rs.getTimestamp(column);
		return ts == null ? null : ts.toInstant();
	}

}
