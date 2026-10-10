"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminErrorMessage, POPUP_FIELDS, popupBody, type FormState, type PopupValues } from "@/lib/admin-popups";
import { ApiError, apiFetch } from "@/lib/api";
import { kstLocalInputToIso } from "@/lib/time";
import type { AdminPopup } from "@/lib/types";

const ID = /^\d{1,18}$/;

const textOf = (formData: FormData) => (name: string) => String(formData.get(name) ?? "").trim();

/** Maps an API failure to form state; a lost session goes back to the admin login. */
function failure(error: unknown, prev: FormState, values: Record<string, string>, loginNext: string): FormState {
  if (!(error instanceof ApiError)) throw error;
  if (error.status === 401) redirect(`/admin/login?next=${encodeURIComponent(loginNext)}`);
  const fieldErrors: Record<string, string> = {};
  for (const { field, message } of error.fieldErrors) if (field in values) fieldErrors[field] = message;
  return { values, fieldErrors, message: adminErrorMessage(error.code, error.message), attempt: (prev.attempt ?? 0) + 1 };
}

export async function savePopup(prev: FormState, formData: FormData): Promise<FormState> {
  const text = textOf(formData);
  const values = Object.fromEntries(POPUP_FIELDS.map((f) => [f, text(f)])) as PopupValues;
  const popupId = text("popupId");
  if (popupId && !ID.test(popupId)) return { values, message: adminErrorMessage("NOT_FOUND"), attempt: (prev.attempt ?? 0) + 1 };

  const { body, errors } = popupBody(values, new Date().toISOString());
  if (Object.keys(errors).length > 0)
    return { values, fieldErrors: errors, message: adminErrorMessage("VALIDATION_FAILED"), attempt: (prev.attempt ?? 0) + 1 };

  let saved: AdminPopup;
  try {
    saved = popupId
      ? await apiFetch<AdminPopup>(`/api/admin/popups/${popupId}`, {
          method: "PUT",
          body: JSON.stringify({ ...body, expectedUpdatedAt: text("expectedUpdatedAt") }),
        })
      : await apiFetch<AdminPopup>("/api/admin/popups", { method: "POST", body: JSON.stringify(body) });
  } catch (error) {
    return failure(error, prev, values, popupId ? `/admin/popups/${popupId}/edit` : "/admin/popups/new");
  }
  redirect(`/admin/popups/${saved.id}/edit?saved=1`);
}

export async function deletePopup(prev: FormState, formData: FormData): Promise<FormState> {
  const popupId = textOf(formData)("popupId");
  if (!ID.test(popupId)) return { message: adminErrorMessage("NOT_FOUND") };
  try {
    await apiFetch<void>(`/api/admin/popups/${popupId}`, { method: "DELETE" });
  } catch (error) {
    return failure(error, prev, {}, `/admin/popups/${popupId}/edit`);
  }
  redirect("/admin/popups");
}

const slotsPath = (popupId: string) => `/admin/popups/${popupId}/slots`;

export async function createSlot(prev: FormState, formData: FormData): Promise<FormState> {
  const text = textOf(formData);
  const popupId = text("popupId");
  const values = { date: text("date"), startTime: text("startTime"), endTime: text("endTime"), capacity: text("capacity") };
  const startsAt = kstLocalInputToIso(`${values.date}T${values.startTime}`);
  const endsAt = kstLocalInputToIso(`${values.date}T${values.endTime}`);
  if (!ID.test(popupId) || !startsAt || !endsAt)
    return { values, message: "날짜와 시간을 확인해 주세요.", attempt: (prev.attempt ?? 0) + 1 };
  try {
    await apiFetch(`/api/admin/popups/${popupId}/slots`, {
      method: "POST",
      body: JSON.stringify({ startsAt, endsAt, capacity: Number(values.capacity) }),
    });
  } catch (error) {
    return failure(error, prev, values, slotsPath(popupId));
  }
  revalidatePath(slotsPath(popupId));
  return { success: "회차를 추가했습니다.", values: { ...values, startTime: "", endTime: "" }, attempt: (prev.attempt ?? 0) + 1 };
}

export async function bulkCreateSlots(prev: FormState, formData: FormData): Promise<FormState> {
  const text = textOf(formData);
  const popupId = text("popupId");
  const values = {
    fromDate: text("fromDate"),
    toDate: text("toDate"),
    times: text("times"),
    durationMinutes: text("durationMinutes"),
    capacity: text("capacity"),
  };
  const times = values.times.split(",").map((t) => t.trim()).filter(Boolean);
  if (!ID.test(popupId) || times.length === 0 || times.some((t) => !/^\d{2}:\d{2}$/.test(t)))
    return { values, fieldErrors: { times: "시간을 11:00, 13:00 형식으로 입력해 주세요." }, message: adminErrorMessage("VALIDATION_FAILED"), attempt: (prev.attempt ?? 0) + 1 };
  let result: { created: number; skipped: number };
  try {
    result = await apiFetch(`/api/admin/popups/${popupId}/slots/bulk`, {
      method: "POST",
      body: JSON.stringify({
        fromDate: values.fromDate,
        toDate: values.toDate,
        times,
        durationMinutes: Number(values.durationMinutes),
        capacity: Number(values.capacity),
      }),
    });
  } catch (error) {
    return failure(error, prev, values, slotsPath(popupId));
  }
  revalidatePath(slotsPath(popupId));
  return { success: `${result.created}개 생성, ${result.skipped}개 건너뜀`, values, attempt: (prev.attempt ?? 0) + 1 };
}

export async function updateSlotCapacity(prev: FormState, formData: FormData): Promise<FormState> {
  const text = textOf(formData);
  const popupId = text("popupId");
  const slotId = text("slotId");
  const values = { capacity: text("capacity") };
  if (!ID.test(popupId) || !ID.test(slotId)) return { values, message: adminErrorMessage("NOT_FOUND"), attempt: (prev.attempt ?? 0) + 1 };
  try {
    await apiFetch(`/api/admin/slots/${slotId}`, { method: "PATCH", body: JSON.stringify({ capacity: Number(values.capacity) }) });
  } catch (error) {
    return failure(error, prev, values, slotsPath(popupId));
  }
  revalidatePath(slotsPath(popupId));
  return { success: "정원을 변경했습니다.", attempt: (prev.attempt ?? 0) + 1 };
}

export async function deleteSlot(prev: FormState, formData: FormData): Promise<FormState> {
  const text = textOf(formData);
  const popupId = text("popupId");
  const slotId = text("slotId");
  if (!ID.test(popupId) || !ID.test(slotId)) return { message: adminErrorMessage("NOT_FOUND") };
  try {
    await apiFetch<void>(`/api/admin/slots/${slotId}`, { method: "DELETE" });
  } catch (error) {
    return failure(error, prev, {}, slotsPath(popupId));
  }
  revalidatePath(slotsPath(popupId));
  return {};
}
