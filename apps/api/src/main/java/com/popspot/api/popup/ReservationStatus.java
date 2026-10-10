package com.popspot.api.popup;

import java.time.Instant;

/**
 * Customer-facing reservation state, derived on every request from the server clock (no scheduler).
 * Precedence, first match wins:
 * <ol>
 * <li>publish status ENDED → CLOSED</li>
 * <li>manually closed by an operator → CLOSED</li>
 * <li>now ≥ closes_at → CLOSED</li>
 * <li>now &lt; opens_at → WAITING</li>
 * <li>no future slot at all → CLOSED</li>
 * <li>every future slot full → SOLD_OUT</li>
 * <li>otherwise → OPEN</li>
 * </ol>
 */
public enum ReservationStatus {

	WAITING, OPEN, SOLD_OUT, CLOSED;

	public static ReservationStatus resolve(String publishStatus, boolean manuallyClosed, Instant opensAt, Instant closesAt,
			int futureSlots, int futureSlotsWithSeats, Instant now) {
		if ("ENDED".equals(publishStatus) || manuallyClosed) {
			return CLOSED;
		}
		if (closesAt != null && !now.isBefore(closesAt)) {
			return CLOSED;
		}
		if (now.isBefore(opensAt)) {
			return WAITING;
		}
		if (futureSlots == 0) {
			return CLOSED;
		}
		return futureSlotsWithSeats == 0 ? SOLD_OUT : OPEN;
	}

}
