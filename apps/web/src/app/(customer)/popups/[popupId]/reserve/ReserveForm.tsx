"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ReserveField, ReserveState } from "@/lib/reservation-form";

type Summary = { label: string; title: string; date: string; time: string; address: string };

type Props = {
  action: (state: ReserveState, formData: FormData) => Promise<ReserveState>;
  popupId: number;
  slotId: number;
  maxPartySize: number;
  idempotencyKey: string;
  email: string;
  summary: Summary;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
      {pending ? "예약 처리 중..." : "예약 확정"}
    </button>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="small" id={id} style={{ color: "var(--danger)", margin: 0 }}>
      {message}
    </p>
  ) : null;
}

export function ReserveForm({ action, popupId, slotId, maxPartySize, idempotencyKey, email, summary }: Props) {
  const [state, formAction] = useActionState(action, {});
  const [count, setCount] = useState(() => Math.min(state.values?.partySize ?? 1, maxPartySize));
  const values = state.values;
  const error = (field: ReserveField) => state.fieldErrors?.[field];
  const describe = (field: ReserveField) =>
    error(field) ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};

  return (
    <form className="reserve-layout" action={formAction}>
      <input type="hidden" name="popupId" value={popupId} />
      <input type="hidden" name="slotId" value={slotId} />
      <input type="hidden" name="idempotencyKey" value={state.idempotencyKey ?? idempotencyKey} />
      <input type="hidden" name="partySize" value={count} />
      <div>
        {state.message && (
          <div className="notice notice-warning" role="alert" style={{ marginBottom: 16 }}>
            <span aria-hidden="true">!</span>
            <span>{state.message}</span>
          </div>
        )}
        <section className="form-card">
          <h2>예약 인원</h2>
          <div className="counter">
            <div>
              <strong>일반 방문자</strong>
              <div className="small muted">최대 {maxPartySize}명까지 예약 가능</div>
            </div>
            <div className="counter-control">
              <button type="button" aria-label="인원 줄이기" disabled={count <= 1} onClick={() => setCount((n) => Math.max(1, n - 1))}>
                −
              </button>
              <strong aria-live="polite">{count}</strong>
              <button type="button" aria-label="인원 늘리기" disabled={count >= maxPartySize} onClick={() => setCount((n) => Math.min(maxPartySize, n + 1))}>
                ＋
              </button>
            </div>
          </div>
          <FieldError id="partySize-error" message={error("partySize")} />
        </section>
        <section className="form-card">
          <h2>예약자 정보</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="contactName">이름</label>
              <input className="input" id="contactName" name="contactName" autoComplete="name" required maxLength={50} defaultValue={values?.contactName} {...describe("contactName")} />
              <FieldError id="contactName-error" message={error("contactName")} />
            </div>
            <div className="field">
              <label htmlFor="contactPhone">휴대폰 번호</label>
              <input className="input" id="contactPhone" name="contactPhone" type="tel" autoComplete="tel" placeholder="010-1234-5678" required defaultValue={values?.contactPhone} {...describe("contactPhone")} />
              <FieldError id="contactPhone-error" message={error("contactPhone")} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="contactEmail">예약 안내 이메일</label>
            <input className="input" id="contactEmail" name="contactEmail" type="email" autoComplete="email" required maxLength={254} defaultValue={values?.contactEmail ?? email} {...describe("contactEmail")} />
            <FieldError id="contactEmail-error" message={error("contactEmail")} />
          </div>
        </section>
        <section className="form-card">
          <h2>약관 동의</h2>
          <label className="check-row">
            <input type="checkbox" name="agree" required defaultChecked={values?.agree} {...describe("agree")} />
            <span>
              <strong>필수 약관에 모두 동의합니다.</strong>
              <br />
              <span className="small muted">개인정보 수집 및 예약 취소 정책</span>
            </span>
          </label>
          <FieldError id="agree-error" message={error("agree")} />
        </section>
      </div>
      <aside className="summary-card">
        <div className="summary-art">{summary.label}</div>
        <h3 style={{ marginTop: 16 }}>{summary.title}</h3>
        <ul className="summary-list">
          <li><span>날짜</span><strong>{summary.date}</strong></li>
          <li><span>시간</span><strong>{summary.time} (KST)</strong></li>
          <li><span>인원</span><strong>{count}명</strong></li>
          <li><span>장소</span><strong>{summary.address}</strong></li>
          <li><span>결제</span><strong>무료</strong></li>
        </ul>
        <SubmitButton />
        <p className="small muted" style={{ textAlign: "center", margin: "10px 0 0" }}>버튼을 누르면 예약이 즉시 확정됩니다.</p>
      </aside>
    </form>
  );
}
