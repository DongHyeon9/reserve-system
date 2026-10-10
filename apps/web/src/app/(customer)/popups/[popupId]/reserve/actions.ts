"use server";

import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { reservationErrorMessage, validateReserve, type ReserveField, type ReserveState, type ReserveValues } from "@/lib/reservation-form";
import type { Reservation } from "@/lib/types";

const FIELDS: ReserveField[] = ["partySize", "contactName", "contactPhone", "contactEmail"];

export async function reserve(prev: ReserveState, formData: FormData): Promise<ReserveState> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const popupId = text("popupId");
  const slotId = text("slotId");
  const idempotencyKey = text("idempotencyKey");
  const values: ReserveValues = {
    partySize: Number(text("partySize")),
    contactName: text("contactName"),
    contactPhone: text("contactPhone"),
    contactEmail: text("contactEmail"),
    agree: formData.get("agree") === "on",
  };

  if (!/^\d{1,18}$/.test(popupId) || !/^\d{1,18}$/.test(slotId) || idempotencyKey.length < 8 || idempotencyKey.length > 100)
    return { ...prev, values, fieldErrors: {}, message: reservationErrorMessage("HEADER_REQUIRED") };
  const fieldErrors = validateReserve(values);
  if (Object.keys(fieldErrors).length > 0) return { ...prev, values, fieldErrors, message: "입력한 예약 정보를 확인해 주세요." };

  let reservation: Reservation;
  try {
    reservation = await apiFetch<Reservation>("/api/reservations", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        slotId: Number(slotId),
        partySize: values.partySize,
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        contactEmail: values.contactEmail,
      }),
    });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 401) redirect(`/login?next=${encodeURIComponent(`/popups/${popupId}/reserve?slotId=${slotId}`)}`);
    const serverFieldErrors: ReserveState["fieldErrors"] = {};
    for (const { field, message } of error.fieldErrors) {
      if ((FIELDS as string[]).includes(field)) serverFieldErrors[field as ReserveField] = message;
    }
    return {
      values,
      fieldErrors: serverFieldErrors,
      message: reservationErrorMessage(error.code, error.message),
      // A 4xx means Spring rejected the request without booking, so an edited retry gets a fresh key.
      // 5xx/network failures keep the key: the booking may have landed and a replay must return it.
      idempotencyKey: error.status < 500 ? crypto.randomUUID() : prev.idempotencyKey,
    };
  }
  redirect(`/reservations/${encodeURIComponent(reservation.id)}/complete`);
}
