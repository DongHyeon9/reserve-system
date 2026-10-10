"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/admin-popups";
import {
  CONFIRM_WORD, canRun, fieldRanges, RUN_FIELDS, SCENARIOS, STATUS_TEXT, scenarioLabel, successRate, validateRun,
  type RunField, type RunValues,
} from "@/lib/ops-tests";
import type { OpsLimits, OpsRun, OpsScenario } from "@/lib/types";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const FIELD_LABELS: Record<RunField, (max: number, min: number) => string> = {
  virtualUsers: (max) => `가상 사용자 · 최대 ${max}`,
  targetRps: (max) => `목표 RPS · 최대 ${max}`,
  durationSeconds: (max, min) => `지속 시간 · ${min}~${max}초`,
  capacity: (max, min) => `테스트 회차 정원 · ${min}~${max}`,
};

function Alert({ message }: { message?: string }) {
  return message ? (
    <div className="notice notice-warning" role="alert" style={{ marginTop: 12 }}>
      <span aria-hidden="true">!</span>
      <span>{message}</span>
    </div>
  ) : null;
}

function RunButton({ disabled, running }: { disabled: boolean; running: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary btn-block" type="submit" disabled={disabled || pending} style={{ marginTop: 16 }}>
      {pending ? "시작 중..." : running ? "실행 중" : "테스트 실행"}
    </button>
  );
}

/** Scenario, inputs and the pre-run checklist. The button mirrors the rules; Spring re-validates role, limits and single-run. */
export function OpsRunForm({ limits, running, action }: { limits: OpsLimits; running: boolean; action: Action }) {
  const [state, formAction] = useActionState(action, {});
  const [scenario, setScenario] = useState<OpsScenario>("LOAD");
  const [values, setValues] = useState<RunValues>({ virtualUsers: "50", targetRps: "50", durationSeconds: "30", capacity: "20" });
  const [checked, setChecked] = useState(false);
  const [confirmWord, setConfirmWord] = useState("");
  const errors = validateRun(values, limits);
  const ranges = fieldRanges(limits);
  const enabled = canRun({ checked, confirmWord, valid: Object.keys(errors).length === 0, running });

  return (
    <form className="debug-layout" action={formAction}>
      <input type="hidden" name="scenario" value={scenario} />
      <section className="admin-card">
        <div className="admin-card-head">
          <h2>테스트 시나리오</h2>
          <span className="small muted">동시에 1개만 실행</span>
        </div>
        <div className="admin-card-body">
          <div className="scenario-grid" role="group" aria-label="테스트 시나리오">
            {SCENARIOS.map((s) => (
              <button
                key={s.value}
                className={`scenario-card${s.value === scenario ? " scenario-card-active" : ""}`}
                type="button"
                aria-pressed={s.value === scenario}
                onClick={() => setScenario(s.value)}
              >
                <strong>{s.icon} {s.label}</strong>
                <span>{s.description}</span>
              </button>
            ))}
          </div>
          <div className="form-grid" style={{ marginTop: 20 }}>
            {RUN_FIELDS.map((f) => {
              const [min, max] = ranges[f];
              const error = errors[f] ?? state.fieldErrors?.[f];
              return (
                <div className="field" key={f}>
                  <label htmlFor={`ops-${f}`}>{FIELD_LABELS[f](max, min)}</label>
                  <input
                    className="input"
                    id={`ops-${f}`}
                    name={f}
                    type="number"
                    inputMode="numeric"
                    required
                    min={min}
                    max={max}
                    value={values[f]}
                    onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
                    {...(error ? { "aria-invalid": true, "aria-describedby": `ops-${f}-error` } : {})}
                  />
                  {error && (
                    <p className="small" id={`ops-${f}-error`} style={{ color: "var(--danger)", margin: 0 }}>
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {scenario === "FAULT" && (
            <div className="notice notice-warning" style={{ marginTop: 18 }}>
              <span aria-hidden="true">!</span>
              <span>장애 시나리오는 테스트 대상에 통제된 5xx 오류를 주입합니다. 실패 지표는 의도된 결과입니다.</span>
            </div>
          )}
          <div className="notice notice-info" style={{ marginTop: 18 }}>
            <span aria-hidden="true">ⓘ</span>
            <span>합성 계정과 격리된 테스트 회차만 사용하며 모든 실행은 감사 로그에 기록됩니다.</span>
          </div>
        </div>
      </section>
      <aside className="admin-card">
        <div className="admin-card-head">
          <h2>실행 전 확인</h2>
        </div>
        <div className="admin-card-body">
          <ul className="debug-limits">
            <li><span>최대 가상 사용자</span><strong>{limits.maxVirtualUsers}명</strong></li>
            <li><span>최대 요청률</span><strong>{limits.maxRps} RPS</strong></li>
            <li><span>자동 종료</span><strong>{limits.maxDurationSeconds}초</strong></li>
            <li><span>테스트 데이터 TTL</span><strong>{limits.dataTtlMinutes}분</strong></li>
            <li><span>핵심 불변식</span><strong>초과 예약 0</strong></li>
          </ul>
          <label className="check-row small" style={{ marginTop: 18 }}>
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> 운영 데이터와 분리된 테스트임을 확인했습니다.
          </label>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="ops-confirm">확인을 위해 {CONFIRM_WORD} 입력</label>
            <input className="input" id="ops-confirm" autoComplete="off" placeholder={CONFIRM_WORD} value={confirmWord} onChange={(e) => setConfirmWord(e.target.value)} />
          </div>
          <RunButton disabled={!enabled} running={running} />
          {running && <p className="small muted" style={{ margin: "10px 0 0" }}>실행 중인 테스트가 끝나면 다시 실행할 수 있습니다.</p>}
          <p className="small muted" style={{ margin: "10px 0 0" }}>권한·대상·상한은 서버에서 다시 검증합니다.</p>
          <Alert message={state.message} />
        </div>
      </aside>
    </form>
  );
}

function StopButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-danger btn-sm" type="submit" disabled={pending}>
      {pending ? "중지 중..." : "즉시 중지"}
    </button>
  );
}

const POLL_PATH = "/admin/operations/tests/current";

/** Latest run. While RUNNING it polls the Next route handler every second and refreshes the page once the run ends. */
export function OpsLiveRun({ run, stopAction }: { run: OpsRun; stopAction: Action }) {
  const router = useRouter();
  const [polled, setPolled] = useState<OpsRun | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [stopState, stopFormAction] = useActionState(stopAction, {});
  const status = useRef<HTMLSpanElement>(null);
  const stopRequested = useRef(false);
  // The server prop wins once it reports an end; until then the poll result is newer.
  const live = run.status === "RUNNING" && polled?.id === run.id ? polled : run;
  const running = live.status === "RUNNING";

  useEffect(() => {
    if (!running) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(POLL_PATH, { cache: "no-store" });
        if (!active) return;
        if (response.status === 204) return;
        if (!response.ok) {
          setPollError(response.status === 403 ? "운영도구(OPS_TEST) 권한이 필요합니다." : "실시간 상태를 불러오지 못했습니다. 다시 시도하는 중입니다.");
          if (response.status === 403) clearInterval(timer);
          return;
        }
        const next = (await response.json()) as OpsRun;
        if (!active) return;
        setPollError(null);
        setPolled(next);
        if (next.status !== "RUNNING") {
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        if (active) setPollError("실시간 상태를 불러오지 못했습니다. 다시 시도하는 중입니다.");
      }
    }, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [running, run.id, router]);

  useEffect(() => {
    if (!running && stopRequested.current) {
      stopRequested.current = false;
      status.current?.focus();
    }
  }, [running]);

  const m = live.metrics;
  return (
    <section className="admin-card debug-run-card" aria-label="실행 현황">
      <div className="admin-card-head">
        <div>
          <span ref={status} tabIndex={-1} id="ops-run-status" className={`status-pulse${running ? "" : " status-stopped"}`} role="status">
            {STATUS_TEXT[live.status]}
          </span>
          <span className="small" style={{ marginLeft: 10 }}>
            {scenarioLabel(live.scenario)} · {live.virtualUsers} users · {live.targetRps} RPS · {live.durationSeconds}초
          </span>
        </div>
        {running && (
          <form action={stopFormAction} onSubmit={() => { stopRequested.current = true; }}>
            <input type="hidden" name="runId" value={live.id} />
            <StopButton />
          </form>
        )}
      </div>
      <div className="admin-card-body">
        <div className="metric-grid">
          <div className="metric-card"><span>누적 요청</span><strong>{m.requests.toLocaleString("ko-KR")}</strong></div>
          <div className="metric-card"><span>성공률</span><strong>{successRate(m)}</strong></div>
          <div className="metric-card"><span>p95 응답</span><strong>{m.p95Ms}ms</strong></div>
          <div className="metric-card" data-metric="overbooked">
            <span>정원 초과</span>
            <strong className={m.overbooked > 0 ? "metric-danger" : "metric-ok"}>{m.overbooked}건</strong>
          </div>
          <div className="metric-card"><span>예약 수/정원</span><strong>{m.reservedCount}/{live.capacity}</strong></div>
        </div>
        <Alert message={pollError ?? stopState.message ?? undefined} />
        <h3 style={{ marginTop: 20 }}>최근 이벤트 · 민감정보 마스킹</h3>
        <div className="debug-log" aria-live="polite">
          {live.events.length === 0 ? <div>이벤트 대기 중</div> : live.events.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      </div>
    </section>
  );
}
