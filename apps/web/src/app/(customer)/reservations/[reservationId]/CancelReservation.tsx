"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { CancelState } from "./actions";

type Action = (state: CancelState, formData: FormData) => Promise<CancelState>;

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-danger" type="submit" disabled={pending}>
      {pending ? "취소 처리 중..." : "예약 취소 확인"}
    </button>
  );
}

export function CancelReservation({ reservationId, action }: { reservationId: string; action: Action }) {
  const [state, formAction] = useActionState(action, {});
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={trigger} className="btn btn-danger btn-block" id="cancel-booking" type="button" onClick={() => dialog.current?.showModal()}>
        예약 취소
      </button>
      {/* Native modal dialog: showModal focuses the first button (돌아가기), traps focus, closes on Esc; onClose returns focus to the trigger. */}
      <dialog ref={dialog} id="cancel-dialog" aria-labelledby="cancel-dialog-title" onClose={() => trigger.current?.focus()}>
        <form action={formAction}>
          <input type="hidden" name="reservationId" value={reservationId} />
          <div className="dialog-body">
            <p className="eyebrow">Cancel reservation</p>
            <h2 id="cancel-dialog-title">예약을 취소할까요?</h2>
            <p className="muted">취소하면 선택한 회차의 좌석이 즉시 반환됩니다. 이 작업은 되돌릴 수 없습니다.</p>
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
            <ConfirmButton />
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Status badge; focused after a cancel so keyboard and screen-reader users land on the new state. */
export function StatusBadge({ className, label, focus }: { className: string; label: string; focus?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus]);
  return (
    <span ref={ref} className={className} id="booking-status" tabIndex={-1}>
      {label}
    </span>
  );
}
