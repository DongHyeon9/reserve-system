package com.popspot.api;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

/** Settable server clock for boundary tests. Starts at real time; call {@link #set} to pin it. */
public class TestClock extends Clock {

	private final AtomicReference<Instant> now = new AtomicReference<>();

	public void set(Instant instant) {
		now.set(instant);
	}

	public void reset() {
		now.set(null);
	}

	public void advance(Duration duration) {
		now.updateAndGet(i -> (i == null ? Instant.now() : i).plus(duration));
	}

	@Override
	public Instant instant() {
		Instant pinned = now.get();
		return pinned == null ? Instant.now() : pinned;
	}

	@Override
	public ZoneId getZone() {
		return ZoneOffset.UTC;
	}

	@Override
	public Clock withZone(ZoneId zone) {
		throw new UnsupportedOperationException();
	}

}
