"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/admin-popups";
import { ApiError, apiFetch } from "@/lib/api";
import { opsErrorMessage, RUN_FIELDS, SCENARIOS, validateRun, type RunValues } from "@/lib/ops-tests";

const PATH = "/admin/operations/tests";
const ID = /^[\w-]{1,64}$/;

function failure(error: unknown, prev: FormState): FormState {
  if (!(error instanceof ApiError)) throw error;
  if (error.status === 401) redirect(`/admin/login?next=${encodeURIComponent(PATH)}`);
  const fieldErrors: Record<string, string> = {};
  for (const { field, message } of error.fieldErrors) if ((RUN_FIELDS as readonly string[]).includes(field)) fieldErrors[field] = message;
  return { fieldErrors, message: opsErrorMessage(error.code, error.message), attempt: (prev.attempt ?? 0) + 1 };
}

export async function startTest(prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const scenario = String(formData.get("scenario") ?? "");
  const values = Object.fromEntries(RUN_FIELDS.map((f) => [f, String(formData.get(f) ?? "")])) as RunValues;
  const fieldErrors = validateRun(values);
  if (!SCENARIOS.some((s) => s.value === scenario) || Object.keys(fieldErrors).length > 0)
    return { fieldErrors, message: opsErrorMessage("VALIDATION_FAILED"), attempt };
  try {
    await apiFetch(`/api/ops/tests`, {
      method: "POST",
      body: JSON.stringify({ scenario, ...Object.fromEntries(RUN_FIELDS.map((f) => [f, Number(values[f])])) }),
    });
  } catch (error) {
    return failure(error, prev);
  }
  revalidatePath(PATH);
  return { success: "테스트를 시작했습니다.", attempt };
}

export async function stopTest(prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("runId") ?? "");
  if (!ID.test(id)) return { message: opsErrorMessage("NOT_FOUND"), attempt: (prev.attempt ?? 0) + 1 };
  try {
    await apiFetch(`/api/ops/tests/${id}/stop`, { method: "POST" });
  } catch (error) {
    return failure(error, prev);
  }
  revalidatePath(PATH);
  return { success: "테스트를 중지했습니다.", attempt: (prev.attempt ?? 0) + 1 };
}
