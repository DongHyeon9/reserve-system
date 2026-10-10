"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/admin-reservations";
import type { BookingStatus } from "@/lib/types";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

function Submit({ className, label, pendingLabel, disabled }: { className: string; label: string; pendingLabel: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={disabled || pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function Alert({ message }: { message?: string }) {
  return message ? (
    <div className="notice notice-warning" role="alert" style={{ marginTop: 12 }}>
      <span aria-hidden="true">!</span>
      <span>{message}</span>
    </div>
  ) : null;
}

type Props = {
  reservationId: string;
  status: BookingStatus;
  canCancel: boolean;
  canCheckIn: boolean;
  cancelAction: Action;
  checkInAction: Action;
};

/** Header actions. Spring decides canCancel/canCheckIn and re-checks on every call; the buttons only mirror that. */
export function AdminReservationActions({ reservationId, status, canCancel, canCheckIn, cancelAction, checkInAction }: Props) {
  const [cancelState, cancelFormAction] = useActionState(cancelAction, {});
  const [checkInState, checkInFormAction] = useActionState(checkInAction, {});
  const [reason, setReason] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reasonError = cancelState.fieldErrors?.reason;

  useEffect(() => {
    if (cancelState.success) dialog.current?.close();
  }, [cancelState]);

  const success = cancelState.success ?? checkInState.success;
  return (
    <div>
      <div className="hero-actions">
        {canCancel && (
          <button ref={trigger} className="btn btn-danger" type="button" onClick={() => dialog.current?.showModal()}>
            예약 취소
          </button>
        )}
        {status === "CONFIRMED" && (
          <form action={checkInFormAction}>
            <input type="hidden" name="reservationId" value={reservationId} />
            <Submit className="btn btn-primary" label="체크인 처리" pendingLabel="체크인 중..." disabled={!canCheckIn} />
          </form>
        )}
      </div>
      {status === "CONFIRMED" && !canCheckIn && <p className="small muted" style={{ margin: "8px 0 0" }}>체크인은 방문 당일에만 가능합니다.</p>}
      <Alert message={checkInState.message} />
      {success && (
        <p className="small" role="status" style={{ color: "var(--success)", margin: "8px 0 0" }}>
          {success}
        </p>
      )}
      <dialog ref={dialog} aria-labelledby="admin-cancel-title" onClose={() => trigger.current?.focus()}>
        <form action={cancelFormAction}>
          <input type="hidden" name="reservationId" value={reservationId} />
          <div className="dialog-body">
            <h2 id="admin-cancel-title">예약을 취소할까요?</h2>
            <p className="muted">관리자 취소는 고객 취소 마감과 관계없이 처리되며 좌석이 즉시 반환됩니다.</p>
            <div className="field">
              <label htmlFor="cancel-reason">취소 사유</label>
              <textarea
                className="textarea"
                id="cancel-reason"
                name="reason"
                required
                maxLength={200}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                {...(reasonError ? { "aria-invalid": true, "aria-describedby": "cancel-reason-error" } : {})}
              />
              {reasonError && (
                <p className="small" id="cancel-reason-error" style={{ color: "var(--danger)", margin: 0 }}>
                  {reasonError}
                </p>
              )}
            </div>
            <Alert message={cancelState.message} />
          </div>
          <div className="dialog-actions">
            <button className="btn btn-secondary" type="button" onClick={() => dialog.current?.close()}>
              돌아가기
            </button>
            <Submit className="btn btn-danger" label="예약 취소 확인" pendingLabel="취소 처리 중..." />
          </div>
        </form>
      </dialog>
    </div>
  );
}

type ContactProps = { reservationId: string; phoneMasked: string; emailMasked: string; action: Action };

/** Masked by default; full values are fetched only after an explicit click (audit-logged server-side). */
export function RevealContact({ reservationId, phoneMasked, emailMasked, action }: ContactProps) {
  const [state, formAction] = useActionState(action, {});
  const contact = state.contact;
  return (
    <>
      <div className="detail-pair">
        <dt>휴대폰</dt>
        <dd>
          <span className="tabular">{contact?.contactPhone ?? phoneMasked}</span>{" "}
          {!contact && (
            <form action={formAction} style={{ display: "inline" }}>
              <input type="hidden" name="reservationId" value={reservationId} />
              <Submit className="btn btn-ghost btn-sm" label="보기" pendingLabel="조회 중..." />
            </form>
          )}
          <div className="small muted">조회 이력이 기록됩니다.</div>
          <Alert message={state.message} />
        </dd>
      </div>
      <div className="detail-pair">
        <dt>이메일</dt>
        <dd>{contact?.contactEmail ?? emailMasked}</dd>
      </div>
    </>
  );
}
