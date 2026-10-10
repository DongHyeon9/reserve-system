"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/admin-popups";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

function Submit({ label, className = "btn btn-secondary btn-sm", disabled }: { label: string; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending || disabled}>
      {label}
    </button>
  );
}

function Feedback({ state }: { state: FormState }) {
  if (state.message)
    return (
      <div className="notice notice-warning" role="alert" style={{ marginTop: 10 }}>
        <span aria-hidden="true">!</span>
        <span>
          {state.message}
          {Object.values(state.fieldErrors ?? {}).map((m) => (
            <span key={m} className="small" style={{ display: "block" }}>{m}</span>
          ))}
        </span>
      </div>
    );
  return state.success ? (
    <p className="small" role="status" style={{ color: "var(--success)", margin: "10px 0 0" }}>{state.success}</p>
  ) : null;
}

/** Inline capacity edit; the API rejects values below the reserved count (CAPACITY_BELOW_RESERVED). */
export function CapacityForm({ action, popupId, slotId, capacity, label }: { action: Action; popupId: number; slotId: number; capacity: number; label: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} key={state.attempt ?? 0} noValidate>
      <input type="hidden" name="popupId" value={popupId} />
      <input type="hidden" name="slotId" value={slotId} />
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input className="input" style={{ width: 90, minHeight: 34 }} type="number" name="capacity" min={1} max={1000} aria-label={`${label} 회차 정원`} defaultValue={state.values?.capacity ?? capacity} />
        <Submit label="정원 변경" />
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function DeleteSlotForm({ action, popupId, slotId, reserved, label }: { action: Action; popupId: number; slotId: number; reserved: number; label: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="popupId" value={popupId} />
      <input type="hidden" name="slotId" value={slotId} />
      <button className="btn btn-ghost btn-sm" type="submit" disabled={reserved > 0} aria-label={`${label} 회차 삭제`} title={reserved > 0 ? "예약이 있는 회차는 삭제할 수 없습니다." : undefined}>
        삭제
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function AddSlotForm({ action, popupId, date }: { action: Action; popupId: number; date: string }) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values ?? {};
  return (
    <form className="editor-section" action={formAction} key={state.attempt ?? 0} noValidate>
      <h2>회차 추가</h2>
      <input type="hidden" name="popupId" value={popupId} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="slot-date">날짜 · 한국 시간(KST)</label>
          <input className="input" id="slot-date" name="date" type="date" required defaultValue={v.date ?? date} />
        </div>
        <div className="field">
          <label htmlFor="slot-capacity">정원</label>
          <input className="input" id="slot-capacity" name="capacity" type="number" min={1} max={1000} required defaultValue={v.capacity ?? "20"} />
        </div>
        <div className="field">
          <label htmlFor="slot-start">시작 시간 · 한국 시간(KST)</label>
          <input className="input" id="slot-start" name="startTime" type="time" required defaultValue={v.startTime} />
        </div>
        <div className="field">
          <label htmlFor="slot-end">종료 시간 · 한국 시간(KST)</label>
          <input className="input" id="slot-end" name="endTime" type="time" required defaultValue={v.endTime} />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <Submit label="＋ 회차 추가" className="btn btn-primary" />
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function BulkSlotForm({ action, popupId, from, to }: { action: Action; popupId: number; from: string; to: string }) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values ?? {};
  return (
    <form className="editor-section" action={formAction} key={state.attempt ?? 0} noValidate>
      <h2>일괄 생성</h2>
      <p className="muted small">이미 같은 시작 시간의 회차가 있으면 건너뜁니다.</p>
      <input type="hidden" name="popupId" value={popupId} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="bulk-from">시작일 · 한국 시간(KST)</label>
          <input className="input" id="bulk-from" name="fromDate" type="date" required defaultValue={v.fromDate ?? from} />
        </div>
        <div className="field">
          <label htmlFor="bulk-to">종료일 · 한국 시간(KST)</label>
          <input className="input" id="bulk-to" name="toDate" type="date" required defaultValue={v.toDate ?? to} />
        </div>
      </div>
      <div className="field" style={{ marginTop: 16 }}>
        <label htmlFor="bulk-times">시작 시간 목록 · 한국 시간(KST)</label>
        <input className="input" id="bulk-times" name="times" placeholder="11:00, 13:00, 15:00" required defaultValue={v.times} />
      </div>
      <div className="form-grid" style={{ marginTop: 16 }}>
        <div className="field">
          <label htmlFor="bulk-duration">회차 길이(분)</label>
          <input className="input" id="bulk-duration" name="durationMinutes" type="number" min={10} max={600} required defaultValue={v.durationMinutes ?? "60"} />
        </div>
        <div className="field">
          <label htmlFor="bulk-capacity">정원</label>
          <input className="input" id="bulk-capacity" name="capacity" type="number" min={1} max={1000} required defaultValue={v.capacity ?? "20"} />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <Submit label="일괄 생성" className="btn btn-secondary" />
      </div>
      <Feedback state={state} />
    </form>
  );
}
