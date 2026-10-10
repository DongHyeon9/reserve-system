package com.popspot.api.popup;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ReservationStatusTests {

	static final Instant OPENS = Instant.parse("2026-10-20T05:00:00Z");

	static final Instant CLOSES = Instant.parse("2026-11-17T12:00:00Z");

	@ParameterizedTest(name = "{0}")
	@CsvSource({
			// case,                           publish,   manual, now,                       slots, withSeats, expected
			"one second before open,           PUBLISHED, false,  2026-10-20T04:59:59Z,      3,     3,         WAITING",
			"exactly at open,                  PUBLISHED, false,  2026-10-20T05:00:00Z,      3,     3,         OPEN",
			"one second after open,            PUBLISHED, false,  2026-10-20T05:00:01Z,      3,     3,         OPEN",
			"all future slots full,            PUBLISHED, false,  2026-10-21T00:00:00Z,      3,     0,         SOLD_OUT",
			"no future slots,                  PUBLISHED, false,  2026-10-21T00:00:00Z,      0,     0,         CLOSED",
			"exactly at close,                 PUBLISHED, false,  2026-11-17T12:00:00Z,      3,     3,         CLOSED",
			"manual close beats open,          PUBLISHED, true,   2026-10-21T00:00:00Z,      3,     3,         CLOSED",
			"manual close beats waiting,       PUBLISHED, true,   2026-10-01T00:00:00Z,      3,     3,         CLOSED",
			"ended beats everything,           ENDED,     false,  2026-10-21T00:00:00Z,      3,     3,         CLOSED",
	})
	void resolvesByPrecedence(String name, String publish, boolean manual, Instant now, int slots, int withSeats, ReservationStatus expected) {
		assertThat(ReservationStatus.resolve(publish, manual, OPENS, CLOSES, slots, withSeats, now)).isEqualTo(expected);
	}

	@ParameterizedTest
	@CsvSource({ "2026-10-20T04:59:59Z, WAITING", "2030-01-01T00:00:00Z, OPEN" })
	void missingCloseTimeNeverClosesByTime(Instant now, ReservationStatus expected) {
		assertThat(ReservationStatus.resolve("PUBLISHED", false, OPENS, null, 1, 1, now)).isEqualTo(expected);
	}

}
