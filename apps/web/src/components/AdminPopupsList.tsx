import Link from "next/link";
import { publishBadge, reservationBadge } from "@/lib/admin-popups";
import { kstDateKey, kstTime, shortDate } from "@/lib/time";
import type { AdminPopupRow, PageResponse } from "@/lib/types";

const kstShort = (iso: string) => `${shortDate(kstDateKey(iso))} ${kstTime(iso)}`;

type Props = { result: PageResponse<AdminPopupRow>; page: number; filtered: boolean; hrefFor: (page: number) => string };

export function AdminPopupsList({ result, page, filtered, hrefFor }: Props) {
  if (result.items.length === 0) {
    const [text, href, label] =
      page > 0
        ? ["요청한 페이지에 팝업이 없습니다.", hrefFor(0), "첫 페이지로"]
        : filtered
          ? ["조건에 맞는 팝업이 없습니다.", "/admin/popups", "조건 초기화"]
          : ["등록된 팝업이 없습니다.", "/admin/popups/new", "＋ 새 팝업"];
    return (
      <div className="admin-card">
        <div className="admin-card-body" style={{ textAlign: "center" }}>
          <p className="lead">{text}</p>
          <Link className="btn btn-secondary" href={href}>{label}</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>팝업</th>
              <th>상태</th>
              <th>회차</th>
              <th>예약</th>
              <th>최근 수정 (KST)</th>
              <th><span className="skip-link">작업</span></th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((row) => {
              const publish = publishBadge(row.publishStatus);
              const reservation = reservationBadge(row.reservationStatus);
              return (
                <tr key={row.id}>
                  <td data-label="팝업">
                    <div className="cell-title">{row.title}</div>
                    <div className="cell-sub">{`${row.area} · ${shortDate(row.startsOn)}—${shortDate(row.endsOn)}`}</div>
                  </td>
                  <td data-label="상태">
                    <span className={`badge ${publish.className}`}>{publish.text}</span>{" "}
                    <span className={`badge ${reservation.className}`}>{reservation.text}</span>
                    {row.reservationStatus === "WAITING" && (
                      <div className="cell-sub" style={{ marginTop: 5 }}>{`${kstShort(row.opensAt)} KST 자동 오픈`}</div>
                    )}
                  </td>
                  <td data-label="회차" className="tabular">{row.slotCount}개</td>
                  <td data-label="예약" className="tabular">{row.activeReservations}건</td>
                  <td data-label="최근 수정 (KST)"><span className="small tabular">{kstShort(row.updatedAt)}</span></td>
                  <td data-label="작업">
                    <div className="row-actions">
                      <Link className="btn btn-secondary btn-sm" href={`/admin/popups/${row.id}/edit`} aria-label={`${row.title} 수정`}>수정</Link>
                      <Link className="btn btn-ghost btn-sm" href={`/admin/popups/${row.id}/slots`} aria-label={`${row.title} 회차`}>회차</Link>
                    </div>
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
