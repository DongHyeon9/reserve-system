import Link from "next/link";
import { kstDateKey, kstTime, shortDate } from "@/lib/time";
import type { PopupSummary } from "@/lib/types";

function badge(popup: PopupSummary) {
  switch (popup.reservationStatus) {
    case "OPEN":
      return popup.remainingSeats > 0 && popup.remainingSeats <= 10
        ? { text: "마감 임박", className: "badge-warning" }
        : { text: "예약 가능", className: "badge-success" };
    case "WAITING":
      return { text: "오픈 대기", className: "badge-warning" };
    case "SOLD_OUT":
      return { text: "매진", className: "badge-neutral" };
    case "CLOSED":
      return { text: "예약 마감", className: "badge-neutral" };
  }
}

function footer(popup: PopupSummary) {
  switch (popup.reservationStatus) {
    case "WAITING":
      return `${shortDate(kstDateKey(popup.opensAt))} ${kstTime(popup.opensAt)} KST 오픈`;
    case "OPEN":
      return `잔여 ${popup.remainingSeats}석`;
    case "SOLD_OUT":
      return "잔여 0석";
    case "CLOSED":
      return "운영 종료";
  }
}

export function PopupCard({ popup }: { popup: PopupSummary }) {
  const status = badge(popup);
  return (
    <article className="popup-card">
      <div className={`card-art art-${popup.artTheme}`} role="img" aria-label={`${popup.title} 포스터 이미지`}>
        <span className="art-label">{popup.label}</span>
      </div>
      <div className="card-body">
        <div className="card-kicker">
          <span>{popup.area} · {popup.category}</span>
          <span className={`badge ${status.className}`}>{status.text}</span>
        </div>
        <h3>{popup.title}</h3>
        <p className="card-meta tabular">{shortDate(popup.startsOn)} — {shortDate(popup.endsOn)}</p>
        <div className="card-footer">
          <span className="small strong">{footer(popup)}</span>
          <Link className="text-link" href={`/popups/${popup.id}`} aria-label={`${popup.title} ${popup.reservationStatus === "WAITING" ? "오픈 일정 보기" : "상세 보기"}`}>
            {popup.reservationStatus === "WAITING" ? "오픈 일정 보기 →" : "상세 보기 →"}
          </Link>
        </div>
      </div>
    </article>
  );
}
