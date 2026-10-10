package com.popspot.api.admin;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import com.popspot.api.popup.ReservationStatus;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Admin catalog requests and responses. Times arrive with an explicit offset and are stored as UTC. */
final class AdminCatalogViews {

	private AdminCatalogViews() {
	}

	record PopupForm(
			@NotBlank(message = "팝업 이름을 입력해 주세요.") @Size(max = 100, message = "100자 이하로 입력해 주세요.") String title,
			@NotBlank(message = "영문 포스터 라벨을 입력해 주세요.") @Size(max = 40, message = "40자 이하로 입력해 주세요.") String label,
			@NotBlank(message = "지역을 입력해 주세요.") @Size(max = 30, message = "30자 이하로 입력해 주세요.") String area,
			@NotBlank(message = "카테고리를 입력해 주세요.") @Size(max = 30, message = "30자 이하로 입력해 주세요.") String category,
			@NotBlank(message = "한 줄 소개를 입력해 주세요.") @Size(max = 200, message = "200자 이하로 입력해 주세요.") String summary,
			@NotNull(message = "공간 소개를 입력해 주세요.") @Size(max = 5000, message = "5000자 이하로 입력해 주세요.") String description,
			@Size(max = 1000, message = "1000자 이하로 입력해 주세요.") String notice,
			@NotBlank(message = "주소를 입력해 주세요.") @Size(max = 200, message = "200자 이하로 입력해 주세요.") String address,
			@NotBlank(message = "운영 시간을 입력해 주세요.") @Size(max = 100, message = "100자 이하로 입력해 주세요.") String operatingHours,
			@NotNull(message = "관람 시간을 입력해 주세요.") @Min(value = 10, message = "10분 이상이어야 합니다.") @Max(value = 600, message = "600분 이하여야 합니다.") Integer visitMinutes,
			@NotNull(message = "테마를 선택해 주세요.") @Pattern(regexp = "red|blue|green|orange|purple|yellow", message = "지원하지 않는 테마입니다.") String artTheme,
			@NotNull(message = "시작일을 입력해 주세요.") LocalDate startsOn,
			@NotNull(message = "종료일을 입력해 주세요.") LocalDate endsOn,
			@NotNull(message = "게시 상태를 선택해 주세요.") @Pattern(regexp = "DRAFT|PUBLISHED|ENDED", message = "지원하지 않는 게시 상태입니다.") String publishStatus,
			@NotNull(message = "예약 오픈 일시를 입력해 주세요.") OffsetDateTime opensAt,
			OffsetDateTime closesAt,
			boolean manuallyClosed,
			@NotNull(message = "최대 인원을 입력해 주세요.") @Min(value = 1, message = "1명 이상이어야 합니다.") @Max(value = 10, message = "10명 이하여야 합니다.") Integer maxPartySize,
			@NotNull(message = "취소 기한을 입력해 주세요.") @Min(value = 0, message = "0시간 이상이어야 합니다.") @Max(value = 168, message = "168시간 이하여야 합니다.") Integer cancelCutoffHours,
			/** Required on update: the updatedAt the editor loaded, for lost-update detection. Ignored on create. */
			Instant expectedUpdatedAt) {
	}

	record AdminPopupRow(long id, String title, String area, String category, LocalDate startsOn, LocalDate endsOn, String publishStatus,
			ReservationStatus reservationStatus, Instant opensAt, int slotCount, int activeReservations, Instant updatedAt) {
	}

	record AdminPopup(long id, String title, String label, String area, String category, String summary, String description, String notice,
			String address, String operatingHours, int visitMinutes, String artTheme, LocalDate startsOn, LocalDate endsOn, String publishStatus,
			Instant opensAt, Instant closesAt, boolean manuallyClosed, int maxPartySize, int cancelCutoffHours, ReservationStatus reservationStatus,
			int slotCount, int activeReservations, Instant updatedAt) {
	}

	record SlotForm(@NotNull(message = "시작 시각을 입력해 주세요.") OffsetDateTime startsAt,
			@NotNull(message = "종료 시각을 입력해 주세요.") OffsetDateTime endsAt,
			@NotNull(message = "정원을 입력해 주세요.") @Min(value = 1, message = "1명 이상이어야 합니다.") @Max(value = 1000, message = "1000명 이하여야 합니다.") Integer capacity) {
	}

	record BulkSlotForm(@NotNull(message = "시작 날짜를 입력해 주세요.") LocalDate fromDate, @NotNull(message = "종료 날짜를 입력해 주세요.") LocalDate toDate,
			@NotEmpty(message = "시간을 하나 이상 입력해 주세요.") @Size(max = 24, message = "하루 24개까지 만들 수 있습니다.") List<@Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d", message = "HH:mm 형식으로 입력해 주세요.") String> times,
			@NotNull(message = "회차 길이를 입력해 주세요.") @Min(value = 10, message = "10분 이상이어야 합니다.") @Max(value = 600, message = "600분 이하여야 합니다.") Integer durationMinutes,
			@NotNull(message = "정원을 입력해 주세요.") @Min(value = 1, message = "1명 이상이어야 합니다.") @Max(value = 1000, message = "1000명 이하여야 합니다.") Integer capacity) {
	}

	record CapacityForm(@NotNull(message = "정원을 입력해 주세요.") @Min(value = 1, message = "1명 이상이어야 합니다.") @Max(value = 1000, message = "1000명 이하여야 합니다.") Integer capacity) {
	}

	record AdminSlot(long id, Instant startsAt, Instant endsAt, int capacity, int reserved, int remaining) {
	}

	record BulkResult(int created, int skipped) {
	}

}
