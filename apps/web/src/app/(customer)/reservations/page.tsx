import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { BOOKING_TABS, bookingBadge, parseTab } from "@/lib/my-reservations";
import { kstBookingDate, kstTime } from "@/lib/time";
import type { ReservationList } from "@/lib/types";

export const metadata = { title: "내 예약" };

const PAGE_SIZE = 10;

export default async function MyReservationsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const raw = await searchParams;
  const tab = parseTab(raw.tab);
  const page = Math.max(0, Number.parseInt(typeof raw.page === "string" ? raw.page : "", 10) || 0);
  const href = (t: string, p = 0) => `/reservations?tab=${t}${p > 0 ? `&page=${p}` : ""}`;

  let result: ReservationList | null = null;
  let error: string | null = null;
  try {
    result = await apiFetch<ReservationList>(`/api/reservations?tab=${tab}&page=${page}&size=${PAGE_SIZE}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(`/login?next=${encodeURIComponent("/reservations")}`);
    error = e instanceof ApiError ? e.message : "예약 목록을 불러오지 못했습니다.";
  }
  const current = BOOKING_TABS.find((t) => t.tab === tab)!;

  return (
    <div className="container">
      <header className="page-hero">
        <p className="eyebrow">My reservations</p>
        <h1>내 예약</h1>
        <p className="lead">예정된 방문과 지난 기록을 한곳에서 확인하세요.</p>
      </header>
      <nav className="tabs" aria-label="예약 상태 필터">
        {BOOKING_TABS.map((t) => (
          <Link key={t.tab} className={t.tab === tab ? "tab tab-active" : "tab"} href={href(t.tab)} aria-current={t.tab === tab ? "page" : undefined}>
            {t.label}{result ? ` ${result.counts[t.count]}` : ""}
          </Link>
        ))}
      </nav>

      {error ? (
        <div className="notice notice-warning" role="alert" style={{ marginBottom: 70 }}>
          <span aria-hidden="true">ⓘ</span>
          <span>{error}</span>
        </div>
      ) : result && result.items.length === 0 ? (
        <div className="section" style={{ textAlign: "center" }}>
          <p className="lead">{current.empty}</p>
          <Link className="btn btn-secondary" href="/popups">팝업 둘러보기</Link>
        </div>
      ) : result && (
        <>
          <div className="booking-list">
            {result.items.map((r) => {
              const date = kstBookingDate(r.slot.startsAt);
              const badge = bookingBadge(r.status);
              return (
                <article className="booking-card" key={r.id}>
                  <div className="booking-date">
                    <span className="small muted">{date.month}</span>
                    <strong>{date.day}</strong>
                    <span className="small">{date.weekday}</span>
                  </div>
                  <div>
                    <span className={badge.className}>{badge.label}</span>
                    <h3 style={{ margin: "8px 0 2px" }}>{r.popup.title}</h3>
                    <p className="card-meta">{kstTime(r.slot.startsAt)} · {r.partySize}명 · {r.popup.area}</p>
                    <span className="small muted tabular">{r.code}</span>
                  </div>
                  <Link className="btn btn-secondary" href={`/reservations/${encodeURIComponent(r.id)}`} aria-label={`${r.popup.title} 예약 상세`}>예약 상세</Link>
                </article>
              );
            })}
          </div>
          {result.totalPages > 1 && (
            <nav className="section hero-actions" aria-label="페이지" style={{ justifyContent: "center", alignItems: "center" }}>
              {page > 0 && <Link className="btn btn-secondary" href={href(tab, page - 1)}>← 이전</Link>}
              <span className="small muted tabular">{page + 1} / {result.totalPages}</span>
              {page + 1 < result.totalPages && <Link className="btn btn-secondary" href={href(tab, page + 1)}>다음 →</Link>}
            </nav>
          )}
        </>
      )}
      <section className="section">
        <div className="notice notice-info">
          <span aria-hidden="true">ⓘ</span>
          <span>예약 시간 10분 전부터 QR 체크인이 가능합니다.</span>
        </div>
      </section>
    </div>
  );
}
