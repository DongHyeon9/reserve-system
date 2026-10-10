import { AdminReservationsList } from "@/components/AdminReservationsList";
import { BOOKING_STATUSES, listFilters, listQuery } from "@/lib/admin-reservations";
import { ApiError, apiFetch } from "@/lib/api";
import type { AdminPopupRow, AdminReservationRow, PageResponse } from "@/lib/types";

export const metadata = { title: "예약 관리" };

const PAGE_SIZE = 20;

export default async function AdminReservationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const filters = listFilters(raw);
  const page = Math.max(0, Number.parseInt(typeof raw.page === "string" ? raw.page : "", 10) || 0);
  const hrefFor = (p: number) => `/admin/reservations${listQuery(filters, p) ? `?${listQuery(filters, p)}` : ""}`;

  const apiQuery = new URLSearchParams(listQuery(filters, 0));
  apiQuery.set("page", String(page));
  apiQuery.set("size", String(PAGE_SIZE));
  const [reservations, popups] = await Promise.allSettled([
    apiFetch<PageResponse<AdminReservationRow>>(`/api/admin/reservations?${apiQuery}`),
    apiFetch<PageResponse<AdminPopupRow>>("/api/admin/popups?size=100"),
  ]);

  let error: string | null = null;
  if (reservations.status === "rejected") {
    const e = reservations.reason;
    if (!(e instanceof ApiError)) throw e;
    error = e.status >= 500 ? "예약 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." : e.message;
  }
  // The popup filter is a convenience; without it the rest of the page still works.
  const popupOptions = popups.status === "fulfilled" ? popups.value.items : [];

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>예약 관리</h1>
          <p>예약 상태를 확인하고 현장 체크인을 처리합니다. 시간은 모두 한국 시간(KST)입니다.</p>
        </div>
      </div>
      <form className="toolbar" method="get" action="/admin/reservations" role="search">
        <input className="input" type="search" name="q" placeholder="예약번호, 이름, 휴대폰 끝자리" aria-label="예약 검색" defaultValue={filters.q} maxLength={100} />
        <select className="select" name="popupId" aria-label="팝업" defaultValue={filters.popupId}>
          <option value="">전체 팝업</option>
          {popupOptions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <input className="input" style={{ width: "auto" }} type="date" name="date" aria-label="방문 날짜 (KST)" defaultValue={filters.date} />
        <select className="select" name="status" aria-label="예약 상태" defaultValue={filters.status}>
          <option value="">전체 상태</option>
          {BOOKING_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" type="submit">필터 적용</button>
      </form>
      {error ? (
        <div className="notice notice-warning" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      ) : (
        reservations.status === "fulfilled" && (
          <AdminReservationsList result={reservations.value} page={page} filtered={Object.values(filters).some(Boolean)} hrefFor={hrefFor} />
        )
      )}
    </>
  );
}
