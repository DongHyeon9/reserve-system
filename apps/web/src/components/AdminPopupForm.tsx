"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState, PopupValues } from "@/lib/admin-popups";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

type Props = {
  action: Action;
  initial: PopupValues;
  popupId?: number;
  expectedUpdatedAt?: string;
  slotCount?: number;
  saved?: boolean;
};

const THEMES = [
  ["red", "레드"],
  ["blue", "블루"],
  ["green", "그린"],
  ["orange", "오렌지"],
  ["purple", "퍼플"],
  ["yellow", "옐로"],
] as const;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
      {pending ? "저장 중..." : "변경 저장"}
    </button>
  );
}

function FieldError({ field, errors }: { field: string; errors?: Record<string, string> }) {
  const message = errors?.[field];
  return message ? (
    <p className="small" id={`${field}-error`} style={{ color: "var(--danger)", margin: 0 }}>
      {message}
    </p>
  ) : null;
}

/** Remounted per attempt (see FormState.attempt), so defaultValue/defaultChecked always reflect `values`. */
function PopupFields({ values, errors, slotCount, saved }: { values: PopupValues; errors?: Record<string, string>; slotCount?: number; saved?: boolean }) {
  const [openMode, setOpenMode] = useState(values.openMode === "scheduled" ? "scheduled" : "now");
  const scheduled = openMode === "scheduled";
  const props = (field: keyof PopupValues) => ({
    id: field,
    name: field,
    defaultValue: values[field],
    ...(errors?.[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {}),
  });

  return (
    <>
      <div>
        <section className="editor-section">
          <h2>기본 정보</h2>
          <div className="field">
            <label htmlFor="title">팝업 이름</label>
            <input className="input" required maxLength={100} {...props("title")} />
            <FieldError field="title" errors={errors} />
          </div>
          <div className="form-grid" style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="label">포스터 라벨 (영문)</label>
              <input className="input" required maxLength={40} {...props("label")} />
              <FieldError field="label" errors={errors} />
            </div>
            <div className="field">
              <label htmlFor="category">카테고리</label>
              <input className="input" required maxLength={40} {...props("category")} />
              <FieldError field="category" errors={errors} />
            </div>
            <div className="field">
              <label htmlFor="area">지역</label>
              <input className="input" required maxLength={40} {...props("area")} />
              <FieldError field="area" errors={errors} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="summary">한 줄 소개</label>
            <input className="input" required maxLength={200} {...props("summary")} />
            <FieldError field="summary" errors={errors} />
          </div>
        </section>
        <section className="editor-section">
          <h2>기간과 장소</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="startsOn">시작일 · 한국 시간(KST)</label>
              <input className="input" type="date" required {...props("startsOn")} />
              <FieldError field="startsOn" errors={errors} />
            </div>
            <div className="field">
              <label htmlFor="endsOn">종료일 · 한국 시간(KST)</label>
              <input className="input" type="date" required {...props("endsOn")} />
              <FieldError field="endsOn" errors={errors} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="address">주소</label>
            <input className="input" required maxLength={200} {...props("address")} />
            <FieldError field="address" errors={errors} />
          </div>
          <div className="form-grid" style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="operatingHours">운영 시간</label>
              <input className="input" required maxLength={100} placeholder="매일 11:00 — 20:00" {...props("operatingHours")} />
              <FieldError field="operatingHours" errors={errors} />
            </div>
            <div className="field">
              <label htmlFor="visitMinutes">관람 시간(분)</label>
              <input className="input" type="number" required min={10} max={600} {...props("visitMinutes")} />
              <FieldError field="visitMinutes" errors={errors} />
            </div>
          </div>
        </section>
        <section className="editor-section">
          <h2>상세 안내</h2>
          <div className="field">
            <label htmlFor="description">공간 소개</label>
            <textarea className="textarea" required {...props("description")} />
            <FieldError field="description" errors={errors} />
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="notice">방문 유의사항 (선택)</label>
            <textarea className="textarea" {...props("notice")} />
            <FieldError field="notice" errors={errors} />
          </div>
        </section>
        <section className="editor-section">
          <h2>예약 정책</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="maxPartySize">1회 최대 예약 인원</label>
              <input className="input" type="number" required min={1} max={10} {...props("maxPartySize")} />
              <FieldError field="maxPartySize" errors={errors} />
            </div>
            <div className="field">
              <label htmlFor="cancelCutoffHours">무료 취소 마감(방문 몇 시간 전)</label>
              <input className="input" type="number" required min={0} max={168} {...props("cancelCutoffHours")} />
              <FieldError field="cancelCutoffHours" errors={errors} />
            </div>
          </div>
        </section>
        <section className="editor-section">
          <h2>예약 오픈 설정</h2>
          <p className="muted small">게시 상태와 별개로 고객의 예약 시작 시점을 설정합니다.</p>
          <div className="chip-row" role="radiogroup" aria-label="예약 오픈 방식">
            <label className={`chip${scheduled ? "" : " chip-active"}`}>
              <input type="radio" name="openMode" value="now" checked={!scheduled} onChange={() => setOpenMode("now")} /> 즉시 오픈
            </label>
            <label className={`chip${scheduled ? " chip-active" : ""}`}>
              <input type="radio" name="openMode" value="scheduled" checked={scheduled} onChange={() => setOpenMode("scheduled")} /> 날짜·시간 지정
            </label>
          </div>
          {scheduled && (
            <>
              <div className="field" style={{ marginTop: 16 }}>
                <label htmlFor="opensAt">예약 오픈 일시 · 한국 시간(KST)</label>
                <input className="input" type="datetime-local" required {...props("opensAt")} />
                <span className="small muted">서버에는 UTC로 저장하고 고객 화면에는 KST로 표시합니다.</span>
                <FieldError field="opensAt" errors={errors} />
              </div>
              <div className="scheduled-box" style={{ marginTop: 16 }}>
                <strong>오픈 대기 → 예약 가능</strong>
                <span>지정한 KST 시각에 서버 기준으로 자동 전환됩니다.</span>
              </div>
            </>
          )}
          {!scheduled && <FieldError field="opensAt" errors={errors} />}
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="closesAt">예약 마감 일시 (선택) · 한국 시간(KST)</label>
            <input className="input" type="datetime-local" {...props("closesAt")} />
            <FieldError field="closesAt" errors={errors} />
          </div>
        </section>
      </div>
      <aside className="editor-side">
        <section className="admin-card">
          <div className="admin-card-head">
            <h3>게시 설정</h3>
          </div>
          <div className="admin-card-body">
            <div className="field">
              <label htmlFor="publishStatus">상태</label>
              <select className="select" {...props("publishStatus")}>
                <option value="DRAFT">초안</option>
                <option value="PUBLISHED">게시 중</option>
                <option value="ENDED">게시 종료</option>
              </select>
              <FieldError field="publishStatus" errors={errors} />
            </div>
            <label className="check-row" style={{ marginTop: 16 }}>
              <input type="checkbox" name="manuallyClosed" defaultChecked={values.manuallyClosed === "on"} />
              <span>예약 수동 마감</span>
            </label>
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="artTheme">포스터 색상</label>
              <select className="select" {...props("artTheme")}>
                {THEMES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            {scheduled && (
              <div className="notice notice-warning" style={{ margin: "16px 0" }}>
                <span aria-hidden="true">◷</span>
                <span><strong>예약 오픈 대기</strong><br />지정한 KST 시각에 자동 오픈</span>
              </div>
            )}
            {slotCount !== undefined && (
              <div className="notice notice-info" style={{ margin: "16px 0" }}>
                <span aria-hidden="true">ⓘ</span>
                <span>회차 {slotCount}개가 연결되어 있습니다.</span>
              </div>
            )}
            {saved && (
              <p className="small" role="status" style={{ color: "var(--success)" }}>저장했습니다.</p>
            )}
            <SaveButton />
          </div>
        </section>
      </aside>
    </>
  );
}

export function AdminPopupForm({ action, initial, popupId, expectedUpdatedAt, slotCount, saved }: Props) {
  const [state, formAction] = useActionState(action, {});
  return (
    <>
      {state.message && (
        <div className="notice notice-warning" role="alert" style={{ marginBottom: 16 }}>
          <span aria-hidden="true">!</span>
          <span>{state.message}</span>
        </div>
      )}
      <form className="editor-layout" action={formAction} key={state.attempt ?? 0}>
        {popupId !== undefined && <input type="hidden" name="popupId" value={popupId} />}
        {expectedUpdatedAt && <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />}
        <PopupFields
          values={(state.values as PopupValues | undefined) ?? initial}
          errors={state.fieldErrors}
          slotCount={slotCount}
          saved={saved && !state.message}
        />
      </form>
    </>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-danger" type="submit" disabled={pending}>
      {pending ? "삭제 중..." : "삭제 확인"}
    </button>
  );
}

export function DeletePopup({ popupId, action }: { popupId: number; action: Action }) {
  const [state, formAction] = useActionState(action, {});
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={trigger} className="btn btn-danger" type="button" onClick={() => dialog.current?.showModal()}>
        삭제
      </button>
      <dialog ref={dialog} aria-labelledby="delete-popup-title" onClose={() => trigger.current?.focus()}>
        <form action={formAction}>
          <input type="hidden" name="popupId" value={popupId} />
          <div className="dialog-body">
            <h2 id="delete-popup-title">팝업을 삭제할까요?</h2>
            <p className="muted">초안 팝업이 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
            {state.message && (
              <div className="notice notice-warning" role="alert">
                <span aria-hidden="true">!</span>
                <span>{state.message}</span>
              </div>
            )}
          </div>
          <div className="dialog-actions">
            <button className="btn btn-secondary" type="button" onClick={() => dialog.current?.close()}>
              돌아가기
            </button>
            <DeleteButton />
          </div>
        </form>
      </dialog>
    </>
  );
}
