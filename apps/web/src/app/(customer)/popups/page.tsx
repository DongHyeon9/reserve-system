import Link from "next/link";
import { PopupCard } from "@/components/PopupCard";
import { ApiError, apiFetch } from "@/lib/api";
import type { PageResponse, PopupFacets, PopupSummary } from "@/lib/types";

export const metadata = { title: "팝업 둘러보기" };

type Search = { q?: string; area?: string; category?: string; page?: string };
const PAGE_SIZE = 12;

export default async function PopupsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const raw = await searchParams;
  const one = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const filters = { q: one(raw.q), area: one(raw.area), category: one(raw.category) };
  const page = Math.max(0, Number.parseInt(one(raw.page), 10) || 0);

  const query = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    if (p > 0) params.set("page", String(p));
    return params.toString();
  };

  let result: PageResponse<PopupSummary> | null = null;
  let facets: PopupFacets = { areas: [], categories: [] };
  let error: string | null = null;
  try {
    const apiQuery = new URLSearchParams(query(page));
    apiQuery.set("page", String(page));
    apiQuery.set("size", String(PAGE_SIZE));
    [result, facets] = await Promise.all([
      apiFetch<PageResponse<PopupSummary>>(`/api/popups?${apiQuery}`),
      apiFetch<PopupFacets>("/api/popups/facets"),
    ]);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "팝업 목록을 불러오지 못했습니다.";
  }

  return (
    <div className="container">
      <header className="page-hero">
        <nav className="breadcrumbs" aria-label="현재 위치">
          <span><Link href="/">홈</Link></span>
          <span aria-current="page">팝업 둘러보기</span>
        </nav>
        <p className="eyebrow">Discover</p>
        <h1>취향에 맞는 팝업 찾기</h1>
        <p className="lead">지역과 카테고리로 지금 예약 가능한 공간을 찾아보세요.</p>
      </header>
      <form className="filter-panel" method="get" action="/popups" role="search">
        <div className="field">
          <label htmlFor="popup-search">팝업 검색</label>
          <input className="input" id="popup-search" name="q" type="search" placeholder="브랜드 또는 팝업 이름" defaultValue={filters.q} maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="area">지역</label>
          <select className="select" id="area" name="area" defaultValue={filters.area}>
            <option value="">전체 지역</option>
            {facets.areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="category">카테고리</label>
          <select className="select" id="category" name="category" defaultValue={filters.category}>
            <option value="">전체 카테고리</option>
            {facets.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" type="submit">검색</button>
      </form>

      {error ? (
        <div className="notice notice-warning" role="alert" style={{ marginBottom: 70 }}>
          <span aria-hidden="true">ⓘ</span>
          <span>{error}</span>
        </div>
      ) : result && result.items.length === 0 ? (
        <div className="section" style={{ textAlign: "center" }}>
          <p className="lead">조건에 맞는 팝업이 없습니다</p>
          <Link className="btn btn-secondary" href="/popups">조건 초기화</Link>
        </div>
      ) : result && (
        <>
          <div className="result-summary">
            <strong>팝업 {result.totalItems}개</strong>
          </div>
          <h2 className="sr-only">검색 결과</h2>
          <div className="card-grid">
            {result.items.map((popup) => <PopupCard key={popup.id} popup={popup} />)}
          </div>
          {result.totalPages > 1 && (
            <nav className="section hero-actions" aria-label="페이지" style={{ justifyContent: "center", alignItems: "center" }}>
              {page > 0 && <Link className="btn btn-secondary" href={`/popups?${query(page - 1)}`}>← 이전</Link>}
              <span className="small muted tabular">{page + 1} / {result.totalPages}</span>
              {page + 1 < result.totalPages && <Link className="btn btn-secondary" href={`/popups?${query(page + 1)}`}>다음 →</Link>}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
