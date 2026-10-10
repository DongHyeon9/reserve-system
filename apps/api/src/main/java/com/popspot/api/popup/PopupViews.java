package com.popspot.api.popup;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Customer-facing popup responses. Times are UTC instants; plain dates are KST calendar dates. */
public final class PopupViews {

	private PopupViews() {
	}

	public record PopupSummary(long id, String title, String label, String area, String category, String artTheme,
			LocalDate startsOn, LocalDate endsOn, Instant opensAt, ReservationStatus reservationStatus, int remainingSeats) {
	}

	public record SlotView(long id, Instant startsAt, Instant endsAt, int capacity, int remaining, boolean reservable) {
	}

	public record PopupDetail(long id, String title, String label, String area, String category, String artTheme,
			LocalDate startsOn, LocalDate endsOn, Instant opensAt, ReservationStatus reservationStatus, int remainingSeats,
			String summary, String description, String notice, String address, String operatingHours, int visitMinutes,
			int maxPartySize, int cancelCutoffHours, Instant closesAt, Instant serverTime, List<SlotView> slots) {
	}

	public record Facets(List<String> areas, List<String> categories) {
	}

}
