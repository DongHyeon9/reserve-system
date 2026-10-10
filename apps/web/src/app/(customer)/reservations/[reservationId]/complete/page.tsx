import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { kstDateTime, kstLongDate, kstTime } from "@/lib/time";
import type { Reservation } from "@/lib/types";

export const metadata = { title: "예약 완료" };

export default async function ReservationCompletePage({ params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;
  if (!/^[\w-]{1,64}$/.test(reservationId)) notFound();

  let reservation: Reservation;
  try {
    reservation = await apiFetch<Reservation>(`/api/reservations/${reservationId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      redirect(`/login?next=${encodeURIComponent(`/reservations/${reservationId}/complete`)}`);
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <div className="container page-hero">
        <h1>예약 정보를 불러오지 못했습니다</h1>
        <p className="lead">{error instanceof ApiError ? error.message : "잠시 후 다시 시도해 주세요."}</p>
      </div>
    );
  }

  if (reservation.status === "CANCELLED") {
    return (
      <div className="container page-hero">
        <h1>취소된 예약입니다</h1>
        <p className="lead">예약번호 {reservation.code}는 취소되었습니다.</p>
        <Link className="btn btn-secondary" href={`/reservations/${reservation.id}`}>예약 상세 보기</Link>
      </div>
    );
  }

  const { popup, slot } = reservation;
  return (
    <div className="success-wrap">
      <div className="success-icon" aria-hidden="true">✓</div>
      <p className="eyebrow">Reservation confirmed</p>
      <h1>예약이 완료됐어요!</h1>
      <p className="lead" style={{ marginInline: "auto" }}>
        {kstLongDate(slot.startsAt)} {kstTime(slot.startsAt)} (KST), {popup.title}에서 만나요.
      </p>
      <article className="ticket">
        <div className="ticket-head">
          <div>
            <span className="badge badge-success">예약 확정</span>
            <h2 style={{ margin: "14px 0 4px" }}>{popup.title}</h2>
            <p className="muted">{popup.area} · {popup.label}</p>
            <div className="booking-code tabular">{reservation.code}</div>
          </div>
          <div className="qr-placeholder" role="img" aria-label="체크인 QR 코드 자리" />
        </div>
        <dl className="info-list" style={{ marginTop: 22 }}>
          <dt>일시</dt>
          <dd>{kstDateTime(slot.startsAt)}</dd>
          <dt>인원</dt>
          <dd>{reservation.partySize}명</dd>
          <dt>장소</dt>
          <dd>{popup.address}</dd>
        </dl>
      </article>
      <div className="hero-actions" style={{ justifyContent: "center" }}>
        <Link className="btn btn-primary" href={`/reservations/${reservation.id}`}>예약 상세 보기</Link>
        <Link className="btn btn-secondary" href="/">홈으로</Link>
      </div>
    </div>
  );
}
