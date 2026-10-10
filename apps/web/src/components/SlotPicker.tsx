"use client";

import Link from "next/link";
import { useState } from "react";
import { kstDateKey, kstDayChip, kstLongDate, kstTime } from "@/lib/time";
import type { Slot } from "@/lib/types";

const firstReservable = (slots: Slot[]) => slots.find((slot) => slot.reservable)?.id ?? null;

export function SlotPicker({ popupId, slots }: { popupId: number; slots: Slot[] }) {
  const byDate = new Map<string, Slot[]>();
  for (const slot of [...slots].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))) {
    const key = kstDateKey(slot.startsAt);
    byDate.set(key, [...(byDate.get(key) ?? []), slot]);
  }
  const dates = [...byDate.keys()];
  const [chosenDate, setDate] = useState(dates[0]);
  // After router.refresh() the chosen date may have dropped out of the (future-only) slot list.
  const date = byDate.has(chosenDate) ? chosenDate : dates[0];
  const [slotId, setSlotId] = useState(() => firstReservable(byDate.get(dates[0]) ?? []));

  const daySlots = byDate.get(date) ?? [];
  const selected = daySlots.find((slot) => slot.id === slotId && slot.reservable);
  const remaining = slots.reduce((sum, slot) => sum + slot.remaining, 0);

  return (
    <>
      <div className="card-footer">
        <h2 style={{ fontSize: 20, margin: 0 }}>날짜와 시간</h2>
        <span className={`badge ${remaining === 0 ? "badge-neutral" : remaining <= 10 ? "badge-warning" : "badge-success"}`}>잔여 {remaining}석</span>
      </div>
      {dates.length === 0 ? (
        <p className="small muted">예약 가능한 회차가 없습니다.</p>
      ) : (
        <>
          <div className="date-row" role="group" aria-label="방문 날짜">
            {dates.map((key) => {
              const chip = kstDayChip(key);
              return (
                <button
                  key={key}
                  className={`choice${key === date ? " choice-active" : ""}`}
                  type="button"
                  aria-pressed={key === date}
                  aria-label={kstLongDate(byDate.get(key)![0].startsAt)}
                  onClick={() => {
                    setDate(key);
                    setSlotId(firstReservable(byDate.get(key)!));
                  }}
                >
                  <span>{chip.weekday}</span>
                  <strong>{chip.day}</strong>
                </button>
              );
            })}
          </div>
          <p className="field-label">{kstLongDate(daySlots[0].startsAt)} · KST</p>
          <div className="slot-grid" role="group" aria-label="방문 시간">
            {daySlots.map((slot) => (
              <button
                key={slot.id}
                className={`choice${!slot.reservable ? " choice-soldout" : slot.id === slotId ? " choice-active" : ""}`}
                type="button"
                aria-pressed={slot.id === slotId}
                disabled={!slot.reservable}
                onClick={() => setSlotId(slot.id)}
              >
                <strong>{kstTime(slot.startsAt)}</strong>
                <span>{slot.reservable ? `${slot.remaining}석 남음` : "매진"}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {selected ? (
        <Link className="btn btn-primary btn-block" href={`/popups/${popupId}/reserve?slotId=${selected.id}`}>
          {kstTime(selected.startsAt)} 예약하기
        </Link>
      ) : (
        <button className="btn btn-primary btn-block" type="button" disabled>
          회차를 선택하세요
        </button>
      )}
      <p className="small muted" style={{ textAlign: "center", margin: "10px 0 0" }}>예약 수수료 없이 바로 확정됩니다.</p>
    </>
  );
}
