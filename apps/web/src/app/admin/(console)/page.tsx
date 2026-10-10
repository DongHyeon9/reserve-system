import Link from "next/link";
import { AlertsCard, KpiGrid, TodaySlotsCard } from "@/components/AdminDashboardView";
import { ApiError, apiFetch } from "@/lib/api";
import { kstLongDate } from "@/lib/time";
import type { AdminDashboard } from "@/lib/types";

export const metadata = { title: "관리자 대시보드" };

export default async function AdminDashboardPage() {
  let dashboard: AdminDashboard | null = null;
  let error: string | null = null;
  try {
    dashboard = await apiFetch<AdminDashboard>("/api/admin/dashboard");
  } catch (e) {
    // 401/403 are already handled by the console layout's guard; anything else is shown inline.
    if (!(e instanceof ApiError)) throw e;
    error = e.status >= 500 ? "운영 지표를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." : e.message;
  }

  return (
    <>
      <div className="admin-page-head">
        <div>
          {dashboard && <p className="eyebrow">{kstLongDate(`${dashboard.date}T12:00:00+09:00`)}</p>}
          <h1>운영 대시보드</h1>
          <p>오늘의 팝업 운영 현황을 확인하세요. 시간은 모두 한국 시간(KST)입니다.</p>
        </div>
        <Link className="btn btn-primary" href="/admin/popups/new">
          ＋ 새 팝업
        </Link>
      </div>
      {error && (
        <div className="notice notice-warning" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}
      {dashboard && (
        <>
          <KpiGrid kpis={dashboard.kpis} />
          <div className="dashboard-grid">
            <TodaySlotsCard slots={dashboard.todaySlots} />
            <AlertsCard alerts={dashboard.alerts} />
          </div>
        </>
      )}
    </>
  );
}
