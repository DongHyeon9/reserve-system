package com.popspot.api.admin;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.popspot.api.common.PageResponse;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Reservation operations for staff. ADMIN is enforced by the /api/admin/** rule in SecurityConfig. */
@RestController
@RequestMapping("/api/admin/reservations")
class AdminReservationController {

	private final AdminReservationService reservations;

	AdminReservationController(AdminReservationService reservations) {
		this.reservations = reservations;
	}

	record CancelForm(@NotBlank(message = "취소 사유를 입력해 주세요.") @Size(max = 200, message = "200자 이하로 입력해 주세요.") String reason) {
	}

	@GetMapping
	PageResponse<AdminReservationService.Row> search(@RequestParam(required = false) @Size(max = 50) String q,
			@RequestParam(required = false) Long popupId, @RequestParam(required = false) LocalDate date,
			@RequestParam(required = false) @Pattern(regexp = "CONFIRMED|CANCELLED|CHECKED_IN") String status,
			@RequestParam(defaultValue = "0") @Min(0) @Max(1000) int page, @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
		return reservations.search(StringUtils.hasText(q) ? q.trim() : null, popupId, date, StringUtils.hasText(status) ? status : null, page, size);
	}

	@GetMapping("/{id}")
	AdminReservationService.Detail get(@PathVariable UUID id) {
		return reservations.get(id);
	}

	@PostMapping("/{id}/contact")
	AdminReservationService.Contact contact(JwtAuthenticationToken auth, @PathVariable UUID id) {
		return reservations.revealContact(UUID.fromString(auth.getName()), id);
	}

	@PostMapping("/{id}/cancel")
	AdminReservationService.Detail cancel(JwtAuthenticationToken auth, @PathVariable UUID id, @Validated @RequestBody CancelForm form) {
		return reservations.cancel(UUID.fromString(auth.getName()), id, form.reason());
	}

	@PostMapping("/{id}/check-in")
	AdminReservationService.Detail checkIn(JwtAuthenticationToken auth, @PathVariable UUID id) {
		return reservations.checkIn(UUID.fromString(auth.getName()), id);
	}

}
