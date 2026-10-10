package com.popspot.api.admin;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.popspot.api.admin.AdminCatalogViews.AdminPopup;
import com.popspot.api.admin.AdminCatalogViews.AdminPopupRow;
import com.popspot.api.admin.AdminCatalogViews.AdminSlot;
import com.popspot.api.admin.AdminCatalogViews.BulkResult;
import com.popspot.api.admin.AdminCatalogViews.BulkSlotForm;
import com.popspot.api.admin.AdminCatalogViews.CapacityForm;
import com.popspot.api.admin.AdminCatalogViews.PopupForm;
import com.popspot.api.admin.AdminCatalogViews.SlotForm;
import com.popspot.api.common.PageResponse;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Popup and session management. ADMIN is enforced by the /api/admin/** rule in SecurityConfig. */
@RestController
@RequestMapping("/api/admin")
class AdminCatalogController {

	private final AdminCatalogService catalog;

	AdminCatalogController(AdminCatalogService catalog) {
		this.catalog = catalog;
	}

	@GetMapping("/popups")
	PageResponse<AdminPopupRow> list(@RequestParam(required = false) @Size(max = 50) String q,
			@RequestParam(required = false) @Pattern(regexp = "DRAFT|PUBLISHED|ENDED") String status,
			@RequestParam(defaultValue = "0") @Min(0) @Max(1000) int page, @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
		return catalog.list(StringUtils.hasText(q) ? q.trim() : null, StringUtils.hasText(status) ? status : null, page, size);
	}

	@GetMapping("/popups/{id}")
	AdminPopup get(@PathVariable long id) {
		return catalog.get(id);
	}

	@PostMapping("/popups")
	ResponseEntity<AdminPopup> create(JwtAuthenticationToken auth, @Validated @RequestBody PopupForm form) {
		AdminPopup created = catalog.create(actor(auth), form);
		return ResponseEntity.created(URI.create("/api/admin/popups/" + created.id())).body(created);
	}

	@PutMapping("/popups/{id}")
	AdminPopup update(JwtAuthenticationToken auth, @PathVariable long id, @Validated @RequestBody PopupForm form) {
		return catalog.update(actor(auth), id, form);
	}

	@DeleteMapping("/popups/{id}")
	ResponseEntity<Void> delete(JwtAuthenticationToken auth, @PathVariable long id) {
		catalog.delete(actor(auth), id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/popups/{id}/slots")
	List<AdminSlot> slots(@PathVariable long id) {
		return catalog.slots(id);
	}

	@PostMapping("/popups/{id}/slots")
	ResponseEntity<AdminSlot> createSlot(JwtAuthenticationToken auth, @PathVariable long id, @Validated @RequestBody SlotForm form) {
		AdminSlot slot = catalog.createSlot(actor(auth), id, form);
		return ResponseEntity.created(URI.create("/api/admin/slots/" + slot.id())).body(slot);
	}

	@PostMapping("/popups/{id}/slots/bulk")
	BulkResult createSlots(JwtAuthenticationToken auth, @PathVariable long id, @Validated @RequestBody BulkSlotForm form) {
		return catalog.createSlots(actor(auth), id, form);
	}

	@PatchMapping("/slots/{slotId}")
	AdminSlot updateCapacity(JwtAuthenticationToken auth, @PathVariable long slotId, @Validated @RequestBody CapacityForm form) {
		return catalog.updateCapacity(actor(auth), slotId, form.capacity());
	}

	@DeleteMapping("/slots/{slotId}")
	ResponseEntity<Void> deleteSlot(JwtAuthenticationToken auth, @PathVariable long slotId) {
		catalog.deleteSlot(actor(auth), slotId);
		return ResponseEntity.noContent().build();
	}

	private static UUID actor(JwtAuthenticationToken auth) {
		return UUID.fromString(auth.getName());
	}

}
