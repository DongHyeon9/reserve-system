import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { bookingBadge } from "@/lib/my-reservations";
import { kstDateTime } from "@/lib/time";
import type { Reservation } from "@/lib/types";
import { cancelReservation } from "./actions";
import { StatusBadge } from "./CancelReservation";
import { ReservationManage } from "./ReservationManage";

export const metadata = { title: "예약 상세" };

export default async function ReservationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reservationId: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { reservationId } = await params;
  const { cancelled } = await searchParams;
  if (!/^[\w-]{1,64}$/.test(reservationId)) notFound();

  let reservation: Reservation;
  try {
    reservation = await apiFetch<Reservation>(`/api/reservations/${reservationId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(`/login?next=${encodeURIComponent(`/reservations/${reservationId}`)}`);
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <div className="container page-hero">
        <h1>예약 정보를 불러오지 못했습니다</h1>
        <p className="lead">{error instanceof ApiError ? error.message : "잠시 후 다시 시도해 주세요."}</p>
        <Link className="btn btn-primary" href="/reservations">내 예약으로</Link>
      </div>
    );
  }

  const { popup, slot } = reservation;
  const badge = bookingBadge(reservation.status);
  const justCancelled = cancelled === "1" && reservation.status === "CANCELLED";

  return (
    <div className="container">
      <header className="page-hero">
        <nav className="breadcrumbs" aria-label="현재 위치">
          <span><Link href="/reservations">내 예약</Link></span>
          <span aria-current="page">{reservation.code}</span>
        </nav>
        <div className="card-footer">
          <div>
            <p className="eyebrow">Reservation detail</p>
            <h1>예약 상세</h1>
          </div>
          <StatusBadge className={badge.className} label={badge.label} focus={justCancelled} />
        </div>
        {justCancelled && (
          <div className="notice notice-info" role="status" style={{ marginTop: 16 }}>
            <span aria-hidden="true">ⓘ</span>
            <span>예약이 취소되었습니다.</span>
          </div>
        )}
      </header>
      <div className="reserve-layout">
        <article>
          <section className="content-card">
            <div className="ticket-head">
              <div>
                <h2>{popup.title}</h2>
                <p className="muted">{popup.area} · {popup.label}</p>
                <div className="booking-code tabular">{reservation.code}</div>
              </div>
              <div className="qr-placeholder" role="img" aria-label="체크인 QR 코드 자리" />
            </div>
            <dl className="info-list" style={{ marginTop: 24 }}>
              <dt>방문 일시</dt>
              <dd>{kstDateTime(slot.startsAt)}</dd>
              <dt>예약 인원</dt>
              <dd>{reservation.partySize}명</dd>
              <dt>예약자</dt>
              <dd>{reservation.contactName} · {reservation.contactPhoneMasked}</dd>
              <dt>장소</dt>
              <dd>{popup.address}</dd>
            </dl>
          </section>
          <section className="content-card" style={{ marginTop: 16 }}>
            <h2>방문 안내</h2>
            <ul>
              <li>예약 시간 10분 전부터 입장할 수 있습니다.</li>
              <li>현장에서 QR 코드 또는 예약번호를 보여주세요.</li>
            </ul>
          </section>
        </article>
        <aside>
          <ReservationManage reservation={reservation} action={cancelReservation} />
        </aside>
      </div>
    </div>
  );
}
