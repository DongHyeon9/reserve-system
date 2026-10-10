import { NextResponse } from "next/server";
import { ApiError, apiFetch } from "@/lib/api";
import type { OpsRun } from "@/lib/types";

// Polled by the live run card; the browser never talks to Spring directly. Spring enforces OPS_TEST.
export async function GET() {
  try {
    const run = await apiFetch<OpsRun | undefined>("/api/ops/tests/current");
    return run ? NextResponse.json(run) : new NextResponse(null, { status: 204 });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return NextResponse.json({ code: error.code, detail: error.message }, { status: error.status });
  }
}
