package com.popspot.api.reservation;

import java.net.URI;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.popspot.api.reservation.ReservationViews.CreateReservationRequest;
import com.popspot.api.reservation.ReservationViews.ReservationView;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/reservations")
class ReservationController {

	private final ReservationService reservations;

	ReservationController(ReservationService reservations) {
		this.reservations = reservations;
	}

	/** 201 for a new booking, 200 with the original booking when the same Idempotency-Key is replayed. */
	@PostMapping
	ResponseEntity<ReservationView> create(JwtAuthenticationToken auth, @RequestHeader("Idempotency-Key") String idempotencyKey,
			@Validated @RequestBody CreateReservationRequest request) {
		var created = reservations.create(UUID.fromString(auth.getName()), idempotencyKey, request);
		if (created.replayed()) {
			return ResponseEntity.ok().header("Idempotency-Replayed", "true").body(created.reservation());
		}
		return ResponseEntity.created(URI.create("/api/reservations/" + created.reservation().id())).body(created.reservation());
	}

	@GetMapping
	ReservationService.ReservationList list(JwtAuthenticationToken auth, @RequestParam(defaultValue = "UPCOMING") ReservationQueries.Tab tab,
			@RequestParam(defaultValue = "0") @Min(0) @Max(1000) int page, @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size) {
		return reservations.list(UUID.fromString(auth.getName()), tab, page, size);
	}

	/** Returns the cancelled reservation; repeating the call is safe and returns the same result. */
	@PostMapping("/{id}/cancel")
	ReservationView cancel(JwtAuthenticationToken auth, @PathVariable UUID id) {
		return reservations.cancel(UUID.fromString(auth.getName()), id, "CUSTOMER");
	}

	@GetMapping("/{id}")
	ReservationView get(JwtAuthenticationToken auth, @PathVariable UUID id) {
		return reservations.get(UUID.fromString(auth.getName()), id);
	}

}
