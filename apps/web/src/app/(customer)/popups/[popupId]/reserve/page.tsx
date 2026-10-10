import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { kstLongDate, kstTime } from "@/lib/time";
import type { PopupDetail } from "@/lib/types";
import { reserve } from "./actions";
import { ReserveForm } from "./ReserveForm";

export const metadata = { title: "예약 정보 확인" };

type Me = { id: string; email: string; roles: string[] };

function Notice({ title, message, popupId }: { title: string; message: string; popupId: string }) {
  return (
    <div className="container page-hero">
      <h1>{title}</h1>
      <p className="lead">{message}</p>
      <Link className="btn btn-primary" href={`/popups/${popupId}`}>팝업 상세로 돌아가기</Link>
    </div>
  );
}

export default async function ReservePage({
  params,
  searchParams,
}: {
  params: Promise<{ popupId: string }>;
  searchParams: Promise<{ slotId?: string }>;
}) {
  const { popupId } = await params;
  const { slotId } = await searchParams;
  if (!/^\d{1,18}$/.test(popupId)) notFound();

  let popup: PopupDetail;
  let me: Me;
  try {
    [popup, me] = await Promise.all([apiFetch<PopupDetail>(`/api/popups/${popupId}`), apiFetch<Me>("/api/me")]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      redirect(`/login?next=${encodeURIComponent(`/popups/${popupId}/reserve?slotId=${slotId ?? ""}`)}`);
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <Notice
        title="예약 정보를 불러오지 못했습니다"
        message={error instanceof ApiError ? error.message : "잠시 후 다시 시도해 주세요."}
        popupId={popupId}
      />
    );
  }

  const slot = popup.slots.find((s) => String(s.id) === slotId);
  if (!slot || !slot.reservable || popup.reservationStatus !== "OPEN") {
    return (
      <Notice
        title="선택한 회차를 예약할 수 없습니다"
        message="회차가 매진되었거나 예약 가능 시간이 아닙니다. 팝업 상세에서 다른 회차를 선택해 주세요."
        popupId={popupId}
      />
    );
  }

  return (
    <div className="container">
      <header className="page-hero">
        <nav className="breadcrumbs" aria-label="현재 위치">
          <span><Link href={`/popups/${popup.id}`}>팝업 상세</Link></span>
          <span aria-current="page">예약</span>
        </nav>
        <p className="eyebrow">Reservation</p>
        <h1>예약 정보 확인</h1>
        <div className="stepper" role="list" aria-label="예약 단계">
          <div className="step step-done" role="listitem">1. 회차 선택 ✓</div>
          <div className="step step-active" role="listitem" aria-current="step">2. 예약 정보</div>
          <div className="step" role="listitem">3. 완료</div>
        </div>
      </header>
      <ReserveForm
        action={reserve}
        popupId={popup.id}
        slotId={slot.id}
        maxPartySize={popup.maxPartySize}
        // Rendered once per form so double-clicks and retries of this form replay the same request.
        idempotencyKey={crypto.randomUUID()}
        email={me.email}
        summary={{ label: popup.label, title: popup.title, date: kstLongDate(slot.startsAt), time: kstTime(slot.startsAt), address: popup.address }}
      />
    </div>
  );
}
