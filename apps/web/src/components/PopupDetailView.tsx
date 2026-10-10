import Link from "next/link";
import { dDay, kstDateTime, kstMonthDayTime, longDate, shortDate } from "@/lib/time";
import type { PopupDetail } from "@/lib/types";
import { RefreshAtServerTime } from "./RefreshAtServerTime";
import { SlotPicker } from "./SlotPicker";

function ReservationAside({ popup }: { popup: PopupDetail }) {
  switch (popup.reservationStatus) {
    case "WAITING":
      return (
        <aside className="reservation-panel" aria-label="예약 오픈 일정">
          <RefreshAtServerTime msUntil={Date.parse(popup.opensAt) - Date.parse(popup.serverTime)} />
          <div className="card-footer">
            <h2 style={{ fontSize: 20, margin: 0 }}>예약 오픈 대기</h2>
            <span className="badge badge-warning">{dDay(popup.opensAt, popup.serverTime)}</span>
          </div>
          <div className="notice notice-warning" style={{ margin: "18px 0" }}>
            <span aria-hidden="true">◷</span>
            <span>
              <strong>{kstMonthDayTime(popup.opensAt)} (KST)</strong>
              <br />
              해당 시각부터 날짜와 회차를 선택할 수 있어요.
            </span>
          </div>
          <button className="btn btn-primary btn-block" type="button" disabled>
            {kstMonthDayTime(popup.opensAt)} 오픈
          </button>
          <p className="small muted" style={{ textAlign: "center", margin: "10px 0 0" }}>오픈 전 예약 요청은 서버에서 차단됩니다.</p>
        </aside>
      );
    case "OPEN":
    case "SOLD_OUT":
      return (
        <aside className="reservation-panel" aria-label="예약 일정 선택">
          {popup.reservationStatus === "SOLD_OUT" && (
            <div className="notice notice-warning" style={{ marginBottom: 18 }}>
              <span aria-hidden="true">ⓘ</span>
              <span>모든 회차가 매진되었습니다.</span>
            </div>
          )}
          <SlotPicker popupId={popup.id} slots={popup.slots} />
        </aside>
      );
    case "CLOSED":
      return (
        <aside className="reservation-panel" aria-label="예약 상태">
          <div className="notice notice-warning">
            <span aria-hidden="true">ⓘ</span>
            <span>예약이 마감되었습니다.</span>
          </div>
        </aside>
      );
  }
}

export function PopupDetailView({ popup }: { popup: PopupDetail }) {
  const waiting = popup.reservationStatus === "WAITING";
  const period = `${shortDate(popup.startsOn)} — ${shortDate(popup.endsOn)}`;
  return (
    <div className="container">
      <div className="page-hero">
        <nav className="breadcrumbs" aria-label="현재 위치">
          <span><Link href="/">홈</Link></span>
          <span><Link href="/popups">팝업</Link></span>
          <span aria-current="page">{popup.title}</span>
        </nav>
      </div>
      <div className={`detail-hero-art art-${popup.artTheme}`} role="img" aria-label={`${popup.title} 팝업 포스터 이미지`}>
        <div className="detail-art-copy">
          <p>{popup.area} · {popup.category}</p>
          <strong>{popup.label}</strong>
        </div>
      </div>
      <div className="detail-layout">
        <article className="detail-content">
          {waiting ? (
            <div className="card-footer">
              <p className="eyebrow">{period}</p>
              <span className="badge badge-warning">오픈 대기</span>
            </div>
          ) : (
            <p className="eyebrow">{period}</p>
          )}
          <h1>{popup.title}</h1>
          <p className="lead">{popup.summary}</p>
          {waiting && (
            <section>
              <h2>예약 오픈 안내</h2>
              <div className="scheduled-box">
                <strong>{kstDateTime(popup.opensAt)}</strong>
                <span>서버 시간을 기준으로 예약이 자동으로 열립니다.</span>
              </div>
            </section>
          )}
          <section>
            <h2>팝업 정보</h2>
            <dl className="info-list">
              <dt>운영 기간</dt>
              <dd>{longDate(popup.startsOn)} — {longDate(popup.endsOn)}</dd>
              <dt>운영 시간</dt>
              <dd>{popup.operatingHours} (KST)</dd>
              <dt>장소</dt>
              <dd>{popup.address}</dd>
              <dt>관람 시간</dt>
              <dd>약 {popup.visitMinutes}분</dd>
            </dl>
          </section>
          {(popup.description || popup.notice) && (
            <section>
              <h2>공간 소개</h2>
              {popup.description && <p>{popup.description}</p>}
              {popup.notice && (
                <div className="notice notice-info">
                  <span aria-hidden="true">ⓘ</span>
                  <span>{popup.notice}</span>
                </div>
              )}
            </section>
          )}
          <section>
            <h2>취소 안내</h2>
            <p>방문 {popup.cancelCutoffHours}시간 전까지 무료로 취소할 수 있습니다. 이후 취소 또는 미방문 시 재예약이 제한될 수 있습니다.</p>
          </section>
        </article>
        <ReservationAside popup={popup} />
      </div>
    </div>
  );
}
