import Link from "next/link";
import { notFound } from "next/navigation";
import { AddSlotForm, BulkSlotForm, CapacityForm, DeleteSlotForm } from "@/components/AdminSlotForms";
import { slotBadge } from "@/lib/admin-popups";
import { ApiError, apiFetch } from "@/lib/api";
import { addDays, kstDateKey, kstDayChip, kstTime, shortDate } from "@/lib/time";
import type { AdminPopup, AdminSlot } from "@/lib/types";
import { bulkCreateSlots, createSlot, deleteSlot, updateSlotCapacity } from "../../actions";

export const metadata = { title: "회차·정원 관리" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminSlotsPage({
  params,
  searchParams,
}: {
  params: Promise<{ popupId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { popupId } = await params;
  const { date: rawDate } = await searchParams;
  if (!/^\d{1,18}$/.test(popupId)) notFound();

  let popup: AdminPopup;
  let slots: AdminSlot[];
  try {
    [popup, slots] = await Promise.all([
      apiFetch<AdminPopup>(`/api/admin/popups/${popupId}`),
      apiFetch<AdminSlot[]>(`/api/admin/popups/${popupId}/slots`),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    if (!(e instanceof ApiError)) throw e;
    return (
      <div className="notice notice-warning" role="alert">
        <span aria-hidden="true">!</span>
        <span>{e.status >= 500 ? "회차 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." : e.message}</span>
      </div>
    );
  }

  const inPeriod = slots.find((s) => {
    const key = kstDateKey(s.startsAt);
    return key >= popup.startsOn && key <= popup.endsOn;
  });
  const date = typeof rawDate === "string" && DATE.test(rawDate) ? rawDate : inPeriod ? kstDateKey(inPeriod.startsAt) : popup.startsOn;
  const today = kstDateKey(new Date().toISOString());
  const daySlots = slots.filter((s) => kstDateKey(s.startsAt) === date);
  const capacity = daySlots.reduce((n, s) => n + s.capacity, 0);
  const reserved = daySlots.reduce((n, s) => n + s.reserved, 0);
  const base = `/admin/popups/${popup.id}/slots`;
  const dayLink = (d: string) => `${base}?date=${d}`;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <nav className="breadcrumbs" aria-label="현재 위치">
            <span><Link href="/admin/popups">팝업 관리</Link></span>
            <span><Link href={`/admin/popups/${popup.id}/edit`}>{popup.title}</Link></span>
            <span aria-current="page">회차·정원</span>
          </nav>
          <h1>회차·정원 관리</h1>
          <p>{`날짜별 방문 시간과 예약 가능 인원을 관리합니다. 운영 기간 ${shortDate(popup.startsOn)}—${shortDate(popup.endsOn)} · 시간은 모두 한국 시간(KST)입니다.`}</p>
        </div>
      </div>
      <div className="slot-summary">
        <div className="slot-stat">
          <span className="small muted">선택 날짜</span>
          <strong>{shortDate(date)}</strong>
          <span className="small">{kstDayChip(date).weekday}요일</span>
        </div>
        <div className="slot-stat">
          <span className="small muted">총 정원</span>
          <strong className="tabular">{capacity}</strong>
          <span className="small">{daySlots.length}개 회차</span>
        </div>
        <div className="slot-stat">
          <span className="small muted">예약 / 잔여</span>
          <strong className="tabular">{reserved} / {capacity - reserved}</strong>
          <span className="small">{capacity > 0 ? `예약률 ${((reserved / capacity) * 100).toFixed(1)}%` : "회차 없음"}</span>
        </div>
      </div>
      <form className="toolbar" method="get" action={base}>
        <input className="input" type="date" name="date" defaultValue={date} aria-label="관리 날짜 · 한국 시간(KST)" />
        <button className="btn btn-secondary btn-sm" type="submit">조회</button>
        <Link className="chip" href={dayLink(addDays(date, -1))}>이전 날</Link>
        <Link className={`chip${date === today ? " chip-active" : ""}`} href={dayLink(today)}>오늘</Link>
        <Link className="chip" href={dayLink(addDays(date, 1))}>다음 날</Link>
      </form>
      <div className="notice notice-warning" style={{ marginBottom: 16 }}>
        <span aria-hidden="true">!</span>
        <span>예약 인원보다 정원을 작게 변경할 수 없습니다.</span>
      </div>
      {daySlots.length === 0 ? (
        <div className="admin-card" style={{ marginBottom: 16 }}>
          <div className="admin-card-body">
            <p className="small muted" style={{ margin: 0 }}>선택한 날짜에 회차가 없습니다. 아래에서 회차를 추가해 주세요.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>시간 (KST)</th>
                <th>정원</th>
                <th>예약</th>
                <th>잔여</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {daySlots.map((slot) => {
                const label = `${kstTime(slot.startsAt)}—${kstTime(slot.endsAt)}`;
                const badge = slotBadge(slot);
                return (
                  <tr key={`${slot.id}-${slot.capacity}-${slot.reserved}`}>
                    <td data-label="시간 (KST)" className="cell-title tabular">{label}</td>
                    <td data-label="정원" className="tabular">{slot.capacity}명</td>
                    <td data-label="예약" className="tabular">{slot.reserved}명</td>
                    <td data-label="잔여" className="tabular">{slot.remaining}석</td>
                    <td data-label="상태"><span className={`badge ${badge.className}`}>{badge.text}</span></td>
                    <td data-label="작업">
                      <div className="row-actions" style={{ alignItems: "flex-start" }}>
                        <CapacityForm action={updateSlotCapacity} popupId={popup.id} slotId={slot.id} capacity={slot.capacity} label={label} />
                        <DeleteSlotForm action={deleteSlot} popupId={popup.id} slotId={slot.id} reserved={slot.reserved} label={label} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="form-grid" style={{ alignItems: "start" }}>
        <AddSlotForm action={createSlot} popupId={popup.id} date={date} />
        <BulkSlotForm action={bulkCreateSlots} popupId={popup.id} from={date} to={popup.endsOn} />
      </div>
    </>
  );
}
