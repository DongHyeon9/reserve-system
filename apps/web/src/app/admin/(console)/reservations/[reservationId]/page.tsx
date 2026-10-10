import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminReservationActions, RevealContact } from "@/components/AdminReservationActions";
import { ACTOR_LABELS, EVENT_LABELS, bookingBadge, kstShort } from "@/lib/admin-reservations";
import { ApiError, apiFetch } from "@/lib/api";
import { kstDateTime, kstTime } from "@/lib/time";
import type { AdminReservation } from "@/lib/types";
import { cancelByAdmin, checkIn, revealContact } from "../actions";

export const metadata = { title: "예약 상세" };

export default async function AdminReservationDetailPage({ params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;
  if (!/^[\w-]{1,64}$/.test(reservationId)) notFound();

  let r: AdminReservation;
  try {
    r = await apiFetch<AdminReservation>(`/api/admin/reservations/${reservationId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    if (!(e instanceof ApiError)) throw e;
    return (
      <div className="notice notice-warning" role="alert">
        <span aria-hidden="true">!</span>
        <span>{e.status >= 500 ? "예약을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." : e.message}</span>
      </div>
    );
  }

  const badge = bookingBadge(r.status);
  return (
    <>
      <div className="admin-page-head">
        <div>
          <nav className="breadcrumbs" aria-label="현재 위치">
            <span><Link href="/admin/reservations">예약 관리</Link></span>
            <span aria-current="page">{r.code}</span>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ margin: 0 }}>예약 상세</h1>
            <span className={`badge ${badge.className}`} id="booking-status">{badge.text}</span>
          </div>
        </div>
        <AdminReservationActions
          reservationId={r.id}
          status={r.status}
          canCancel={r.canCancel}
          canCheckIn={r.canCheckIn}
          cancelAction={cancelByAdmin}
          checkInAction={checkIn}
        />
      </div>
      <div className="dashboard-grid">
        <div>
          <section className="admin-card">
            <div className="admin-card-head">
              <h2>예약 정보</h2>
              <span className="booking-code tabular" style={{ fontSize: 14 }}>{r.code}</span>
            </div>
            <div className="admin-card-body">
              <dl style={{ margin: 0 }}>
                <div className="detail-pair"><dt>팝업</dt><dd>{r.popupTitle}<div className="small muted">{r.popupAddress}</div></dd></div>
                <div className="detail-pair"><dt>방문 일시</dt><dd>{`${kstDateTime(r.slotStartsAt)} — ${kstTime(r.slotEndsAt)}`}</dd></div>
                <div className="detail-pair"><dt>예약 인원</dt><dd>{r.partySize}명</dd></div>
                <div className="detail-pair"><dt>신청 일시</dt><dd>{kstDateTime(r.createdAt)}</dd></div>
              </dl>
            </div>
          </section>
          <section className="admin-card" style={{ marginTop: 18 }}>
            <div className="admin-card-head">
              <h2>고객 정보</h2>
              <span className="small muted">개인정보 보호 적용</span>
            </div>
            <div className="admin-card-body">
              <dl style={{ margin: 0 }}>
                <div className="detail-pair"><dt>예약자</dt><dd>{r.contactName}</dd></div>
                <RevealContact reservationId={r.id} phoneMasked={r.contactPhoneMasked} emailMasked={r.contactEmailMasked} action={revealContact} />
              </dl>
            </div>
          </section>
        </div>
        <aside className="admin-card">
          <div className="admin-card-head"><h2>상태 이력</h2></div>
          <div className="admin-card-body">
            <ol className="timeline" aria-label="상태 이력">
              {r.events.map((event, i) => (
                <li key={i}>
                  <strong>{EVENT_LABELS[event.type]}</strong>
                  <div className="small muted tabular">{`${kstShort(event.occurredAt)} KST · ${ACTOR_LABELS[event.actorRole]}`}</div>
                </li>
              ))}
            </ol>
            <div className="notice notice-info">
              <span aria-hidden="true">ⓘ</span>
              <span>체크인 처리는 방문 당일(KST)에만 가능합니다.</span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
