package com.popspot.api.reservation;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class ReservationViews {

	private ReservationViews() {
	}

	public record CreateReservationRequest(
			@NotNull(message = "회차를 선택해 주세요.") Long slotId,
			@NotNull(message = "인원을 입력해 주세요.") @Min(value = 1, message = "1명 이상 예약해 주세요.") @Max(value = 10, message = "인원이 너무 많습니다.") Integer partySize,
			@NotBlank(message = "이름을 입력해 주세요.") @Size(max = 50, message = "이름은 50자 이하로 입력해 주세요.") String contactName,
			@NotBlank(message = "휴대폰 번호를 입력해 주세요.") @Pattern(regexp = "^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$", message = "휴대폰 번호 형식을 확인해 주세요.") String contactPhone,
			@NotBlank(message = "이메일을 입력해 주세요.") @Email(message = "이메일 형식을 확인해 주세요.") @Size(max = 254, message = "이메일이 너무 깁니다.") String contactEmail) {

		/** Same key must carry the same command; a different body under a reused key is rejected. */
		String fingerprint() {
			String canonical = String.join("\u001f", String.valueOf(slotId), String.valueOf(partySize), contactName.trim(), contactPhone.trim(),
					contactEmail.trim().toLowerCase());
			try {
				return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8)));
			}
			catch (NoSuchAlgorithmException e) {
				throw new IllegalStateException(e);
			}
		}

	}

	public record PopupRef(long id, String title, String label, String area, String address, String artTheme) {
	}

	public record SlotRef(long id, Instant startsAt, Instant endsAt) {
	}

	public record ReservationView(UUID id, String code, String status, PopupRef popup, SlotRef slot, int partySize, String contactName,
			String contactPhoneMasked, String contactEmail, Instant createdAt, Instant cancelledAt, Instant cancellableUntil,
			boolean cancellable) {
	}

	/** "010-1234-5678" → "010-12**-56**". Customers and operators see only the masked form by default. */
	static String maskPhone(String phone) {
		String d = phone.replaceAll("\\D", "");
		int mid = d.length() - 7;
		return d.substring(0, 3) + "-" + d.substring(3, 5) + "*".repeat(mid - 2) + "-" + d.substring(3 + mid, 5 + mid) + "**";
	}

}
