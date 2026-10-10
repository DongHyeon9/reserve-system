import Link from "next/link";
import { bookingBadge, kstShort } from "@/lib/admin-reservations";
import type { AdminReservationRow, PageResponse } from "@/lib/types";

type Props = { result: PageResponse<AdminReservationRow>; page: number; filtered: boolean; hrefFor: (page: number) => string };

export function AdminReservationsList({ result, page, filtered, hrefFor }: Props) {
  if (result.items.length === 0) {
    const [text, link]: [string, [string, string] | null] =
      page > 0
        ? ["요청한 페이지에 예약이 없습니다.", [hrefFor(0), "첫 페이지로"]]
        : filtered
          ? ["조건에 맞는 예약이 없습니다.", ["/admin/reservations", "조건 초기화"]]
          : ["아직 예약이 없습니다.", null];
    return (
      <div className="admin-card">
        <div className="admin-card-body" style={{ textAlign: "center" }}>
          <p className="lead">{text}</p>
          {link && <Link className="btn btn-secondary" href={link[0]}>{link[1]}</Link>}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="result-summary">
        <strong>예약 {result.totalItems.toLocaleString("ko-KR")}건</strong>
        <span className="small muted">고객 정보는 운영에 필요한 범위로 마스킹됩니다.</span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>예약번호</th>
              <th>고객</th>
              <th>방문 회차 (KST)</th>
              <th>인원</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((row) => {
              const badge = bookingBadge(row.status);
              return (
                <tr key={row.id}>
                  <td data-label="예약번호" className="cell-title tabular">{row.code}</td>
                  <td data-label="고객">
                    <div className="cell-title">{row.contactName}</div>
                    <div className="cell-sub tabular">{row.contactPhoneMasked}</div>
                  </td>
                  <td data-label="방문 회차 (KST)">
                    <div className="tabular">{kstShort(row.slotStartsAt)}</div>
                    <div className="cell-sub">{row.popupTitle}</div>
                  </td>
                  <td data-label="인원">{row.partySize}명</td>
                  <td data-label="상태"><span className={`badge ${badge.className}`}>{badge.text}</span></td>
                  <td data-label="작업">
                    <Link className="btn btn-secondary btn-sm" href={`/admin/reservations/${row.id}`} aria-label={`${row.code} 상세 보기`}>상세 보기</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {result.totalPages > 1 && (
        <nav className="hero-actions" aria-label="페이지" style={{ justifyContent: "center", alignItems: "center", marginTop: 20 }}>
          {page > 0 && <Link className="btn btn-secondary btn-sm" href={hrefFor(page - 1)}>← 이전</Link>}
          <span className="small muted tabular">{page + 1} / {result.totalPages}</span>
          {page + 1 < result.totalPages && <Link className="btn btn-secondary btn-sm" href={hrefFor(page + 1)}>다음 →</Link>}
        </nav>
      )}
    </>
  );
}
