import { kstDateTime } from "@/lib/time";
import type { Reservation } from "@/lib/types";
import type { CancelState } from "./actions";
import { CancelReservation } from "./CancelReservation";

type Props = {
  reservation: Pick<Reservation, "id" | "status" | "cancellable" | "cancellableUntil" | "cancelledAt">;
  action: (state: CancelState, formData: FormData) => Promise<CancelState>;
};

/** "예약 관리" aside. Cancellability is the server-computed flag; the browser clock is never consulted. */
export function ReservationManage({ reservation: r, action }: Props) {
  let body: React.ReactNode;
  if (r.status === "CANCELLED") {
    body = (
      <p className="small muted">
        취소된 예약입니다.
        {r.cancelledAt && <><br />취소 일시: {kstDateTime(r.cancelledAt)}</>}
      </p>
    );
  } else if (r.cancellable) {
    body = (
      <>
        <p className="small muted">{kstDateTime(r.cancellableUntil)}까지 무료 취소할 수 있습니다.</p>
        <CancelReservation reservationId={r.id} action={action} />
      </>
    );
  } else if (r.status === "CHECKED_IN") {
    body = <p className="small muted">체크인된 예약은 취소할 수 없습니다.</p>;
  } else {
    body = <p className="small muted">무료 취소 가능 시간({kstDateTime(r.cancellableUntil)})이 지나 취소할 수 없습니다.</p>;
  }
  return (
    <section className="summary-card">
      <h3>예약 관리</h3>
      {body}
    </section>
  );
}
