package com.popspot.api.ops;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** SANDBOX operations tests. OPS_TEST role is enforced by the /api/ops/** rule in SecurityConfig. */
@RestController
@RequestMapping("/api/ops/tests")
class OpsTestController {

	private final OpsTestService tests;

	OpsTestController(OpsTestService tests) {
		this.tests = tests;
	}

	record StartRequest(
			@NotNull(message = "시나리오를 선택해 주세요.") @Pattern(regexp = "LOAD|CONCURRENT_RESERVE|LATENCY|FAULT", message = "지원하지 않는 시나리오입니다.") String scenario,
			@NotNull(message = "가상 사용자 수를 입력해 주세요.") @Min(value = 1, message = "1명 이상이어야 합니다.") @Max(value = OpsTestService.MAX_USERS, message = "최대 100명입니다.") Integer virtualUsers,
			@NotNull(message = "목표 RPS를 입력해 주세요.") @Min(value = 1, message = "1 이상이어야 합니다.") @Max(value = OpsTestService.MAX_RPS, message = "최대 100 RPS입니다.") Integer targetRps,
			@NotNull(message = "지속 시간을 입력해 주세요.") @Min(value = 5, message = "5초 이상이어야 합니다.") @Max(value = OpsTestService.MAX_SECONDS, message = "최대 60초입니다.") Integer durationSeconds,
			@NotNull(message = "정원을 입력해 주세요.") @Min(value = 1, message = "1명 이상이어야 합니다.") @Max(value = 200, message = "최대 200명입니다.") Integer capacity) {
	}

	@GetMapping("/config")
	Map<String, Object> config() {
		return Map.of("enabled", tests.enabled(), "environment", "SANDBOX", "limits",
				Map.of("maxVirtualUsers", OpsTestService.MAX_USERS, "maxRps", OpsTestService.MAX_RPS, "maxDurationSeconds", OpsTestService.MAX_SECONDS,
						"dataTtlMinutes", OpsTestService.DATA_TTL_MINUTES));
	}

	@PostMapping
	ResponseEntity<OpsTestService.Run> start(JwtAuthenticationToken auth, @Validated @RequestBody StartRequest request) {
		var run = tests.start(UUID.fromString(auth.getName()), new OpsTestService.StartForm(request.scenario(), request.virtualUsers(),
				request.targetRps(), request.durationSeconds(), request.capacity()));
		return ResponseEntity.status(HttpStatus.ACCEPTED).body(run);
	}

	@GetMapping("/current")
	ResponseEntity<OpsTestService.Run> current() {
		var run = tests.current();
		return run == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(run);
	}

	@GetMapping
	List<OpsTestService.Run> recent() {
		return tests.recent();
	}

	@PostMapping("/{id}/stop")
	OpsTestService.Run stop(JwtAuthenticationToken auth, @PathVariable UUID id) {
		return tests.stop(UUID.fromString(auth.getName()), id);
	}

}
