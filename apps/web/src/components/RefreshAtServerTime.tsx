"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const MAX_TIMEOUT = 2_147_483_647; // setTimeout overflows past ~24.8 days.

/** Re-renders the server page once the server-computed delay elapses; the browser clock is never consulted. */
export function RefreshAtServerTime({ msUntil }: { msUntil: number }) {
  const router = useRouter();
  useEffect(() => {
    const delay = msUntil + 500;
    if (msUntil < 0 || delay > MAX_TIMEOUT) return;
    const timer = setTimeout(() => router.refresh(), delay);
    return () => clearTimeout(timer);
  }, [msUntil, router]);
  return null;
}
