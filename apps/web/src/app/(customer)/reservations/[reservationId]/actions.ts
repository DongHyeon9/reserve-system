"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { cancelErrorMessage } from "@/lib/my-reservations";

export type CancelState = { message?: string };

/** Spring decides cancellability (deadline, status, ownership); this only forwards the request. Cancel is idempotent server-side. */
export async function cancelReservation(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const id = String(formData.get("reservationId") ?? "");
  if (!/^[\w-]{1,64}$/.test(id)) return { message: "예약을 찾을 수 없습니다." };
  try {
    await apiFetch(`/api/reservations/${id}/cancel`, { method: "POST" });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 401) redirect(`/login?next=${encodeURIComponent(`/reservations/${id}`)}`);
    return { message: cancelErrorMessage(error.code, error.message) };
  }
  revalidatePath("/reservations");
  revalidatePath(`/reservations/${id}`);
  // The query flag lets the re-rendered page move focus to the new status badge and announce the result.
  redirect(`/reservations/${id}?cancelled=1`);
}
