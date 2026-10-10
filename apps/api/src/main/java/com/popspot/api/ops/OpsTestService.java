package com.popspot.api.ops;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.popspot.api.admin.AuditLog;
import com.popspot.api.common.ApiException;
import com.popspot.api.popup.PopupQueries;
import com.popspot.api.reservation.ReservationService;
import com.popspot.api.reservation.ReservationViews;
import com.popspot.api.reservation.ReservationViews.CreateReservationRequest;

import tools.jackson.databind.json.JsonMapper;

/**
 * SANDBOX operations tests. Every run gets its own synthetic popup, slot and users (hidden from customers), is capped at
 * 100 virtual users / 100 RPS / 60 seconds, can be stopped, and its data is deleted after a TTL. Disabled by default and
 * refused at startup under the prod profile.
 */
@Service
public class OpsTestService {

	public static final int MAX_USERS = 100;

	public static final int MAX_RPS = 100;

	public static final int MAX_SECONDS = 60;

	public static final int DATA_TTL_MINUTES = 10;

	/** LATENCY scenario: requests slower than this budget count as failures (timeouts). */
	static final long LATENCY_BUDGET_MS = 500;

	private static final Logger log = LoggerFactory.getLogger(OpsTestService.class);

	private static final DateTimeFormatter EVENT_TIME = DateTimeFormatter.ofPattern("HH:mm:ss").withZone(ZoneId.of("Asia/Seoul"));

	private final JdbcClient jdbc;

	private final TransactionTemplate tx;

	private final ReservationService reservations;

	private final PopupQueries popups;

	private final AuditLog audit;

	private final JsonMapper json;

	private final Clock clock;

	private final boolean enabled;

	private final Map<UUID, LiveRun> live = new ConcurrentHashMap<>();

	OpsTestService(JdbcClient jdbc, TransactionTemplate tx, ReservationService reservations, PopupQueries popups, AuditLog audit, JsonMapper json,
			Clock clock, Environment env, @Value("${popspot.ops-tests.enabled:false}") boolean enabled) {
		if (enabled && env.acceptsProfiles(Profiles.of("prod"))) {
			throw new IllegalStateException("popspot.ops-tests.enabled must not be true in the prod profile");
		}
		this.jdbc = jdbc;
		this.tx = tx;
		this.reservations = reservations;
		this.popups = popups;
		this.audit = audit;
		this.json = json;
		this.clock = clock;
		this.enabled = enabled;
	}

	public record StartForm(String scenario, int virtualUsers, int targetRps, int durationSeconds, int capacity) {
	}

	public record Metrics(long requests, long successes, long failures, long p95Ms, int reservedCount, int overbooked) {
	}

	public record Run(UUID id, String scenario, String status, int virtualUsers, int targetRps, int durationSeconds, int capacity, Instant startedAt,
			Instant endedAt, String startedByMasked, Metrics metrics, List<String> events) {
	}

	/** Mutable state of the run executing in this instance. */
	private static final class LiveRun {

		final AtomicBoolean stop = new AtomicBoolean();

		final AtomicLong requests = new AtomicLong();

		final AtomicLong successes = new AtomicLong();

		final AtomicLong failures = new AtomicLong();

		final List<Long> latencies = Collections.synchronizedList(new ArrayList<>());

		final Deque<String> events = new ArrayDeque<>();

		volatile Thread runner;

		void event(String line) {
			synchronized (events) {
				events.addLast(line);
				while (events.size() > 20) {
					events.removeFirst();
				}
			}
		}

		List<String> events() {
			synchronized (events) {
				return List.copyOf(events);
			}
		}

		long p95() {
			List<Long> copy;
			synchronized (latencies) {
				copy = new ArrayList<>(latencies);
			}
			if (copy.isEmpty()) {
				return 0;
			}
			Collections.sort(copy);
			return copy.get((int) Math.ceil(copy.size() * 0.95) - 1);
		}

	}

	public boolean enabled() {
		return enabled;
	}

	public Run start(UUID actor, StartForm form) {
		requireEnabled();
		Instant now = clock.instant();
		UUID runId = UUID.randomUUID();
		long[] target = tx.execute(status -> {
			long popupId = jdbc.sql("""
					insert into popups (title, label, area, category, summary, address, operating_hours, visit_minutes, starts_on, ends_on,
					                    publish_status, opens_at, synthetic)
					values ('[TEST] 운영 테스트 대상', 'Synthetic', 'SANDBOX', 'TEST', '합성 데이터', '-', '-', 30, ?, ?, 'PUBLISHED', ?, true)
					returning id""")
				.params(now.atZone(ZoneId.of("Asia/Seoul")).toLocalDate(), now.atZone(ZoneId.of("Asia/Seoul")).toLocalDate().plusDays(3),
						Timestamp.from(now.minusSeconds(60)))
				.query(Long.class)
				.single();
			Instant slotStart = now.plus(Duration.ofDays(2));
			long slotId = jdbc.sql("insert into slots (popup_id, starts_at, ends_at, capacity) values (?, ?, ?, ?) returning id")
				.params(popupId, Timestamp.from(slotStart), Timestamp.from(slotStart.plus(Duration.ofHours(1))), form.capacity())
				.query(Long.class)
				.single();
			try {
				jdbc.sql("""
						insert into operation_test_runs (id, scenario, target_slot_id, target_popup_id, virtual_users, target_rps, duration_seconds,
						                                 capacity, status, started_by, started_at, expires_at)
						values (?, ?, ?, ?, ?, ?, ?, ?, 'RUNNING', ?, ?, ?)""")
					.params(runId, form.scenario(), slotId, popupId, form.virtualUsers(), form.targetRps(), form.durationSeconds(), form.capacity(), actor,
							Timestamp.from(now), Timestamp.from(now.plus(Duration.ofSeconds(form.durationSeconds())).plus(Duration.ofMinutes(DATA_TTL_MINUTES))))
					.update();
			}
			catch (DuplicateKeyException e) {
				status.setRollbackOnly();
				return null;
			}
			for (int i = 0; i < form.virtualUsers(); i++) {
				jdbc.sql("insert into app_users (id, email) values (?, ?)").params(UUID.randomUUID(), "run-" + runId + "-" + i + "@ops.invalid").update();
			}
			return new long[] { popupId, slotId };
		});
		if (target == null) {
			throw ApiException.conflict("TEST_ALREADY_RUNNING", "이미 실행 중인 테스트가 있습니다.");
		}
		audit.record(actor, "OPS_TEST_STARTED", "OPS_TEST_RUN", runId, Map.of("scenario", form.scenario(), "virtualUsers", form.virtualUsers(),
				"targetRps", form.targetRps(), "durationSeconds", form.durationSeconds()));

		List<UUID> users = jdbc.sql("select id from app_users where email like ?").param("run-" + runId + "-%@ops.invalid").query(UUID.class).list();
		LiveRun state = new LiveRun();
		live.put(runId, state);
		state.runner = Thread.ofVirtual().name("ops-test-" + runId).start(() -> execute(runId, form, target[0], target[1], users, state));
		return get(runId);
	}

	public Run stop(UUID actor, UUID runId) {
		requireEnabled();
		Run run = get(runId);
		LiveRun state = live.get(runId);
		if (state != null && "RUNNING".equals(run.status())) {
			state.stop.set(true);
			audit.record(actor, "OPS_TEST_STOPPED", "OPS_TEST_RUN", runId, Map.of());
			try {
				state.runner.join(Duration.ofSeconds(5));
			}
			catch (InterruptedException e) {
				Thread.currentThread().interrupt();
			}
		}
		return get(runId);
	}

	public Run current() {
		requireEnabled();
		return jdbc.sql("select id from operation_test_runs order by started_at desc limit 1").query(UUID.class).optional().map(this::get).orElse(null);
	}

	public List<Run> recent() {
		requireEnabled();
		return jdbc.sql("select id from operation_test_runs order by started_at desc limit 10").query(UUID.class).list().stream().map(this::get).toList();
	}

	public Run get(UUID runId) {
		return jdbc.sql("""
				select r.*, u.email from operation_test_runs r join app_users u on u.id = r.started_by where r.id = ?""")
			.param(runId)
			.query((rs, i) -> {
				String status = rs.getString("status");
				LiveRun state = live.get(runId);
				Metrics metrics;
				List<String> events;
				if ("RUNNING".equals(status) && state != null) {
					metrics = new Metrics(state.requests.get(), state.successes.get(), state.failures.get(), state.p95(), reservedCount(rs.getLong("target_slot_id")), 0);
					events = state.events();
				}
				else {
					Map<?, ?> result = json.readValue(rs.getString("result"), Map.class);
					metrics = new Metrics(number(result, "requests"), number(result, "successes"), number(result, "failures"), number(result, "p95Ms"),
							(int) number(result, "reservedCount"), (int) number(result, "overbooked"));
					events = result.get("events") instanceof List<?> list ? list.stream().map(String::valueOf).toList() : List.of();
				}
				Timestamp ended = rs.getTimestamp("ended_at");
				return new Run(runId, rs.getString("scenario"), status, rs.getInt("virtual_users"), rs.getInt("target_rps"), rs.getInt("duration_seconds"),
						rs.getInt("capacity"), rs.getTimestamp("started_at").toInstant(), ended == null ? null : ended.toInstant(),
						ReservationViews.maskEmail(rs.getString("email")), metrics, events);
			})
			.optional()
			.orElseThrow(ApiException::notFound);
	}

	private void execute(UUID runId, StartForm form, long popupId, long slotId, List<UUID> users, LiveRun state) {
		String finalStatus = "COMPLETED";
		Semaphore concurrency = new Semaphore(form.virtualUsers());
		long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(Math.min(form.durationSeconds(), MAX_SECONDS));
		long intervalNanos = TimeUnit.SECONDS.toNanos(1) / form.targetRps();
		long next = System.nanoTime();
		try (var workers = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
			while (!state.stop.get() && System.nanoTime() < deadline) {
				long wait = next - System.nanoTime();
				if (wait > 0) {
					TimeUnit.NANOSECONDS.sleep(wait);
				}
				next += intervalNanos;
				if (!concurrency.tryAcquire()) {
					continue; // every virtual user is busy: skip this tick instead of queueing beyond the user cap
				}
				workers.submit(() -> {
					try {
						request(form.scenario(), popupId, slotId, users, state);
					}
					finally {
						concurrency.release();
					}
				});
			}
			if (state.stop.get()) {
				finalStatus = "STOPPED";
			}
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			finalStatus = "STOPPED";
		}
		catch (RuntimeException e) {
			log.error("Ops test run failed: {}", e.getClass().getName());
			finalStatus = "FAILED";
		}
		finish(runId, slotId, finalStatus, state);
	}

	private void request(String scenario, long popupId, long slotId, List<UUID> users, LiveRun state) {
		long started = System.nanoTime();
		String outcome;
		boolean ok = true;
		try {
			switch (scenario) {
				case "CONCURRENT_RESERVE" -> {
					UUID user = users.get(ThreadLocalRandom.current().nextInt(users.size()));
					try {
						reservations.createForSyntheticTarget(user, "ops-" + UUID.randomUUID(),
								new CreateReservationRequest(slotId, 1, "합성 사용자", "010-0000-0000", "synthetic@ops.invalid"));
						outcome = "reserve 201";
					}
					catch (ApiException e) {
						// Sold out and duplicate are correct, expected answers under contention.
						outcome = "reserve " + e.status().value() + " " + e.code();
					}
				}
				case "LATENCY" -> {
					popups.futureSlots(popupId, clock.instant());
					Thread.sleep(ThreadLocalRandom.current().nextLong(100, 900));
					outcome = "read (injected delay)";
				}
				case "FAULT" -> {
					popups.futureSlots(popupId, clock.instant());
					if (ThreadLocalRandom.current().nextInt(10) == 0) {
						ok = false;
						outcome = "read 503 (injected fault)";
					}
					else {
						outcome = "read 200";
					}
				}
				default -> {
					popups.futureSlots(popupId, clock.instant());
					outcome = "read 200";
				}
			}
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			ok = false;
			outcome = "interrupted";
		}
		catch (RuntimeException e) {
			ok = false;
			outcome = "error " + e.getClass().getSimpleName();
		}
		long ms = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
		if ("LATENCY".equals(scenario) && ms > LATENCY_BUDGET_MS) {
			ok = false;
			outcome += " timeout";
		}
		state.requests.incrementAndGet();
		(ok ? state.successes : state.failures).incrementAndGet();
		state.latencies.add(ms);
		state.event(EVENT_TIME.format(clock.instant()) + "  " + outcome + "  " + ms + "ms  user=synthetic-***");
	}

	/** Stores final metrics and the overbooking invariant: seats taken must equal active party sizes and never exceed capacity. */
	private void finish(UUID runId, long slotId, String status, LiveRun state) {
		record Seats(int capacity, int reserved, int active) {
		}
		Seats seats = jdbc.sql("""
				select s.capacity, s.reserved_count,
				       coalesce((select sum(party_size) from reservations r where r.slot_id = s.id and r.status <> 'CANCELLED'), 0) as active
				from slots s where s.id = ?""")
			.param(slotId)
			.query((rs, i) -> new Seats(rs.getInt("capacity"), rs.getInt("reserved_count"), rs.getInt("active")))
			.single();
		int overbooked = Math.max(0, seats.reserved() - seats.capacity()) + Math.abs(seats.reserved() - seats.active());
		var result = new LinkedHashMap<String, Object>();
		result.put("requests", state.requests.get());
		result.put("successes", state.successes.get());
		result.put("failures", state.failures.get());
		result.put("p95Ms", state.p95());
		result.put("reservedCount", seats.reserved());
		result.put("overbooked", overbooked);
		result.put("events", state.events());
		Instant ended = clock.instant();
		jdbc.sql("""
				update operation_test_runs set status = ?, ended_at = ?, expires_at = ?, result = cast(? as jsonb) where id = ?""")
			.params(status, Timestamp.from(ended), Timestamp.from(ended.plus(Duration.ofMinutes(DATA_TTL_MINUTES))), json.writeValueAsString(result), runId)
			.update();
		audit.record(null, "OPS_TEST_FINISHED", "OPS_TEST_RUN", runId, Map.of("status", status, "overbooked", overbooked));
		live.remove(runId);
	}

	/** A run left RUNNING by a crashed or restarted instance can never finish; close it so a new run can start. */
	@EventListener(ApplicationReadyEvent.class)
	void failOrphanedRuns() {
		jdbc.sql("update operation_test_runs set status = 'FAILED', ended_at = now() where status = 'RUNNING'").update();
	}

	/** Deletes synthetic data whose TTL passed. Runs regardless of the feature flag so leftovers never linger. */
	@Scheduled(fixedDelayString = "${popspot.ops-tests.cleanup-interval-ms:60000}")
	public int cleanupExpired() {
		List<UUID> expired = jdbc.sql("""
				select id from operation_test_runs where status <> 'RUNNING' and cleaned_at is null and expires_at <= ?""")
			.param(Timestamp.from(clock.instant()))
			.query(UUID.class)
			.list();
		for (UUID runId : expired) {
			tx.executeWithoutResult(status -> {
				Long popupId = jdbc.sql("select target_popup_id from operation_test_runs where id = ?").param(runId).query(Long.class).optional().orElse(null);
				String users = "run-" + runId + "-%@ops.invalid";
				if (popupId != null) {
					jdbc.sql("delete from reservation_events where reservation_id in (select id from reservations where popup_id = ?)").param(popupId).update();
					jdbc.sql("delete from idempotency_keys where user_id in (select id from app_users where email like ?)").param(users).update();
					jdbc.sql("delete from reservations where popup_id = ?").param(popupId).update();
					jdbc.sql("delete from slots where popup_id = ?").param(popupId).update();
					jdbc.sql("delete from popups where id = ? and synthetic").param(popupId).update();
				}
				jdbc.sql("delete from idempotency_keys where user_id in (select id from app_users where email like ?)").param(users).update();
				jdbc.sql("delete from app_users where email like ?").param(users).update();
				jdbc.sql("update operation_test_runs set cleaned_at = ? where id = ?").params(Timestamp.from(clock.instant()), runId).update();
			});
		}
		return expired.size();
	}

	private int reservedCount(long slotId) {
		return jdbc.sql("select reserved_count from slots where id = ?").param(slotId).query(Integer.class).optional().orElse(0);
	}

	private void requireEnabled() {
		if (!enabled) {
			throw new ApiException(HttpStatus.FORBIDDEN, "OPS_TESTS_DISABLED", "이 환경에서는 운영 테스트가 비활성화되어 있습니다.");
		}
	}

	private static long number(Map<?, ?> map, String key) {
		return map.get(key) instanceof Number n ? n.longValue() : 0;
	}

}
