import type { AdminDashboard } from "@/lib/types";
import { kstMonthDayTime, kstTime } from "@/lib/time";

type Kpis = AdminDashboard["kpis"];

function deltaText(delta: number | null) {
  if (delta === null) return "어제 예약 없음";
  if (delta > 0) return `↑ 어제보다 ${delta}%`;
  if (delta < 0) return `↓ 어제보다 ${Math.abs(delta)}%`;
  return "어제와 동일";
}

export function KpiGrid({ kpis }: { kpis: Kpis }) {
  const cards = [
    { label: "오늘 예약", value: kpis.todayReservations, sub: deltaText(kpis.reservationDeltaPercent), up: (kpis.reservationDeltaPercent ?? 0) > 0 },
    { label: "오늘 방문", value: kpis.todayVisits, sub: kpis.checkInRatePercent === null ? "예정 방문 없음" : `체크인율 ${kpis.checkInRatePercent}%` },
    { label: "운영 회차", value: kpis.todaySlots, sub: `매진 ${kpis.soldOutSlots}회차` },
    { label: "취소", value: kpis.todayCancellations, sub: kpis.cancelRatePercent === null ? "-" : `취소율 ${kpis.cancelRatePercent}%` },
  ];
  return (
    <section className="kpi-grid" aria-label="오늘 운영 지표">
      {cards.map((card) => (
        <div className="kpi-card" key={card.label}>
          <span className="kpi-label">{card.label}</span>
          <div className="kpi-value tabular">{card.value}</div>
          <span className={card.up ? "kpi-delta" : "small muted"}>{card.sub}</span>
        </div>
      ))}
    </section>
  );
}

export function TodaySlotsCard({ slots }: { slots: AdminDashboard["todaySlots"] }) {
  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <h2>오늘 회차 현황</h2>
      </div>
      <div className="admin-card-body">
        {slots.length === 0 && <p className="small muted">오늘 운영 회차가 없습니다.</p>}
        {slots.map((slot) => {
          const time = kstTime(slot.startsAt);
          const width = slot.capacity > 0 ? Math.min(100, (slot.reserved / slot.capacity) * 100) : 0;
          return (
            <div className="progress-row" key={slot.slotId}>
              <div>
                <strong className="tabular">{time}</strong>
                <div className="small muted">{slot.popupTitle}</div>
              </div>
              <div
                className="progress"
                role="progressbar"
                aria-label={`${slot.popupTitle} ${time} 회차 예약 현황`}
                aria-valuemin={0}
                aria-valuemax={slot.capacity}
                aria-valuenow={slot.reserved}
              >
                <span style={{ width: `${width}%` }} />
              </div>
              <span className="small tabular">
                {slot.reserved}/{slot.capacity}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AlertsCard({ alerts }: { alerts: AdminDashboard["alerts"] }) {
  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <h2>운영 알림</h2>
      </div>
      <div className="admin-card-body">
        {alerts.length === 0 ? (
          <p className="small muted">확인할 알림이 없습니다.</p>
        ) : (
          <ul className="activity-list">
            {alerts.map((alert) => (
              <li key={`${alert.type}-${alert.popupId}-${alert.slotId ?? alert.at}`}>
                {alert.type === "SLOT_NEARLY_FULL" ? (
                  <>
                    <span className="badge badge-warning">마감 임박</span>
                    <p className="small" style={{ margin: "6px 0 0" }}>{`${alert.popupTitle} ${kstTime(alert.at)} 회차 잔여 ${alert.remaining}석`}</p>
                  </>
                ) : (
                  <>
                    <span className="badge badge-blue">오픈 예정</span>
                    <p className="small" style={{ margin: "6px 0 0" }}>{`${alert.popupTitle} · ${kstMonthDayTime(alert.at)} KST`}</p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
