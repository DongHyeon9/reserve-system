package com.popspot.api.popup;

import java.time.Clock;
import java.time.Instant;

import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.popspot.api.common.ApiException;
import com.popspot.api.common.PageResponse;
import com.popspot.api.popup.PopupQueries.PopupRow;
import com.popspot.api.popup.PopupViews.Facets;
import com.popspot.api.popup.PopupViews.PopupDetail;
import com.popspot.api.popup.PopupViews.PopupSummary;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/popups")
class PopupController {

	private final PopupQueries popups;

	private final Clock clock;

	PopupController(PopupQueries popups, Clock clock) {
		this.popups = popups;
		this.clock = clock;
	}

	@GetMapping
	PageResponse<PopupSummary> list(@RequestParam(required = false) @Size(max = 50) String q,
			@RequestParam(required = false) @Size(max = 30) String area,
			@RequestParam(required = false) @Size(max = 30) String category,
			@RequestParam(defaultValue = "0") @Min(0) @Max(1000) int page,
			@RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
		Instant now = clock.instant();
		String query = blankToNull(q);
		var items = popups.search(query, blankToNull(area), blankToNull(category), page, size, now).stream().map(row -> summary(row, now)).toList();
		return PageResponse.of(items, page, size, popups.count(query, blankToNull(area), blankToNull(category)));
	}

	@GetMapping("/facets")
	Facets facets() {
		return new Facets(popups.distinctPublished("area"), popups.distinctPublished("category"));
	}

	@GetMapping("/{id}")
	PopupDetail detail(@PathVariable long id) {
		Instant now = clock.instant();
		PopupRow row = popups.findVisible(id, now).orElseThrow(ApiException::notFound);
		ReservationStatus status = row.status(now);
		boolean open = status == ReservationStatus.OPEN;
		var slots = popups.futureSlots(id, now).stream().map(slot -> slot.view(open)).toList();
		return new PopupDetail(row.id(), row.title(), row.label(), row.area(), row.category(), row.artTheme(), row.startsOn(), row.endsOn(),
				row.opensAt(), status, row.remaining(), row.summary(), row.description(), row.notice(), row.address(), row.operatingHours(),
				row.visitMinutes(), row.maxPartySize(), row.cancelCutoffHours(), row.closesAt(), now, slots);
	}

	private static PopupSummary summary(PopupRow row, Instant now) {
		return new PopupSummary(row.id(), row.title(), row.label(), row.area(), row.category(), row.artTheme(), row.startsOn(), row.endsOn(),
				row.opensAt(), row.status(now), row.remaining());
	}

	private static String blankToNull(String value) {
		return StringUtils.hasText(value) ? value.trim() : null;
	}

}
