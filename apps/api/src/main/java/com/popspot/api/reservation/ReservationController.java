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
import org.springframework.web.bind.annotation.RestController;

import com.popspot.api.reservation.ReservationViews.CreateReservationRequest;
import com.popspot.api.reservation.ReservationViews.ReservationView;

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

	@GetMapping("/{id}")
	ReservationView get(JwtAuthenticationToken auth, @PathVariable UUID id) {
		return reservations.get(UUID.fromString(auth.getName()), id);
	}

}
