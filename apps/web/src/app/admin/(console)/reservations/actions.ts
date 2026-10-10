"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { reservationErrorMessage, type ActionState } from "@/lib/admin-reservations";
import { ApiError, apiFetch } from "@/lib/api";
import type { ReservationContact } from "@/lib/types";

const ID = /^[\w-]{1,64}$/;
const detailPath = (id: string) => `/admin/reservations/${id}`;
const idOf = (formData: FormData) => String(formData.get("reservationId") ?? "");

/** Maps an API failure to action state; a lost session goes back to the admin login. */
function failure(error: unknown, id: string, prev: ActionState, fields: string[] = []): ActionState {
  if (!(error instanceof ApiError)) throw error;
  if (error.status === 401) redirect(`/admin/login?next=${encodeURIComponent(detailPath(id))}`);
  const fieldErrors: Record<string, string> = {};
  for (const { field, message } of error.fieldErrors) if (fields.includes(field)) fieldErrors[field] = message;
  return { fieldErrors, message: reservationErrorMessage(error.code, error.message), attempt: (prev.attempt ?? 0) + 1 };
}

function refresh(id: string) {
  revalidatePath("/admin/reservations");
  revalidatePath(detailPath(id));
}

export async function cancelByAdmin(prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = idOf(formData);
  const reason = String(formData.get("reason") ?? "").trim();
  if (!ID.test(id)) return { message: reservationErrorMessage("NOT_FOUND"), attempt: (prev.attempt ?? 0) + 1 };
  if (reason.length < 1 || reason.length > 200)
    return { fieldErrors: { reason: "취소 사유를 1~200자로 입력해 주세요." }, message: reservationErrorMessage("VALIDATION_FAILED"), attempt: (prev.attempt ?? 0) + 1 };
  try {
    await apiFetch(`/api/admin/reservations/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) });
  } catch (error) {
    return failure(error, id, prev, ["reason"]);
  }
  refresh(id);
  return { success: "예약을 취소했습니다.", attempt: (prev.attempt ?? 0) + 1 };
}

export async function checkIn(prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = idOf(formData);
  if (!ID.test(id)) return { message: reservationErrorMessage("NOT_FOUND"), attempt: (prev.attempt ?? 0) + 1 };
  try {
    await apiFetch(`/api/admin/reservations/${id}/check-in`, { method: "POST" });
  } catch (error) {
    return failure(error, id, prev);
  }
  refresh(id);
  return { success: "체크인했습니다.", attempt: (prev.attempt ?? 0) + 1 };
}

/** Every call is audit-logged by Spring (CONTACT_REVEALED); only invoked on an explicit click. */
export async function revealContact(prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = idOf(formData);
  if (!ID.test(id)) return { message: reservationErrorMessage("NOT_FOUND") };
  try {
    return { contact: await apiFetch<ReservationContact>(`/api/admin/reservations/${id}/contact`, { method: "POST" }) };
  } catch (error) {
    return failure(error, id, prev);
  }
}
