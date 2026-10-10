import Link from "next/link";
import { AdminPopupsList } from "@/components/AdminPopupsList";
import { ApiError, apiFetch } from "@/lib/api";
import type { AdminPopupRow, PageResponse } from "@/lib/types";

export const metadata = { title: "팝업 관리" };

type Search = { q?: string; status?: string; page?: string };
const PAGE_SIZE = 20;
const STATUSES = [
  ["DRAFT", "초안"],
  ["PUBLISHED", "게시 중"],
  ["ENDED", "게시 종료"],
] as const;

export default async function AdminPopupsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const raw = await searchParams;
  const one = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const status = STATUSES.some(([s]) => s === one(raw.status)) ? one(raw.status) : "";
  const filters = { q: one(raw.q), status };
  const page = Math.max(0, Number.parseInt(one(raw.page), 10) || 0);

  const query = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    if (p > 0) params.set("page", String(p));
    return params.toString();
  };
  const hrefFor = (p: number) => `/admin/popups${query(p) ? `?${query(p)}` : ""}`;

  let result: PageResponse<AdminPopupRow> | null = null;
  let error: string | null = null;
  try {
    const apiQuery = new URLSearchParams(query(page));
    apiQuery.set("page", String(page));
    apiQuery.set("size", String(PAGE_SIZE));
    result = await apiFetch<PageResponse<AdminPopupRow>>(`/api/admin/popups?${apiQuery}`);
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    error = e.status >= 500 ? "팝업 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." : e.message;
  }

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>팝업 관리</h1>
          <p>팝업 게시 상태와 예약 오픈 일정을 관리합니다. 시간은 모두 한국 시간(KST)입니다.</p>
        </div>
        <Link className="btn btn-primary" href="/admin/popups/new">＋ 새 팝업</Link>
      </div>
      <form className="toolbar" method="get" action="/admin/popups" role="search">
        <input className="input" type="search" name="q" placeholder="팝업 이름 검색" aria-label="팝업 이름 검색" defaultValue={filters.q} maxLength={100} />
        <select className="select" name="status" aria-label="게시 상태" defaultValue={filters.status}>
          <option value="">전체 상태</option>
          {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" type="submit">필터 적용</button>
      </form>
      {error ? (
        <div className="notice notice-warning" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      ) : (
        result && <AdminPopupsList result={result} page={page} filtered={Boolean(filters.q || filters.status)} hrefFor={hrefFor} />
      )}
    </>
  );
}
