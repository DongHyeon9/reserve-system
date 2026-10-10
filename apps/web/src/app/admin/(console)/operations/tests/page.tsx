import { redirect } from "next/navigation";
import { OpsLiveRun, OpsRunForm } from "@/components/OpsTests";
import { kstShort } from "@/lib/admin-reservations";
import { ApiError, apiFetch } from "@/lib/api";
import { DISABLED_MESSAGE, FORBIDDEN_MESSAGE, runBadge, scenarioLabel } from "@/lib/ops-tests";
import type { OpsConfig, OpsRun } from "@/lib/types";
import { startTest, stopTest } from "./actions";

export const metadata = { title: "운영 테스트" };

function Head() {
  return (
    <div className="admin-page-head">
      <div>
        <p className="eyebrow">Operations lab</p>
        <h1>운영 테스트</h1>
        <p>격리된 합성 데이터로 라이브 상황을 안전하게 재현합니다.</p>
      </div>
      <span className="badge badge-neutral">운영도구 권한 필요</span>
    </div>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className="notice notice-warning" role="alert">
      <span aria-hidden="true">!</span>
      <span>{message}</span>
    </div>
  );
}

function RecentRuns({ runs }: { runs: OpsRun[] }) {
  return (
    <section className="admin-card" style={{ marginTop: 18 }}>
      <div className="admin-card-head">
        <h2>최근 실행</h2>
        <span className="small muted">최근 10회 · 감사 로그 기록</span>
      </div>
      {runs.length === 0 ? (
        <div className="admin-card-body"><p className="muted" style={{ margin: 0 }}>아직 실행 기록이 없습니다.</p></div>
      ) : (
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>실행 시각</th><th>시나리오</th><th>실행자</th><th>결과</th></tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const badge = runBadge(run);
                return (
                  <tr key={run.id}>
                    <td data-label="실행 시각">{kstShort(run.startedAt)} KST</td>
                    <td data-label="시나리오">{scenarioLabel(run.scenario)} · {run.virtualUsers} users</td>
                    <td data-label="실행자">{run.startedByMasked}</td>
                    <td data-label="결과"><span className={`badge ${badge.className}`}>{badge.text}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function OpsTestsPage() {
  let config: OpsConfig;
  try {
    config = await apiFetch<OpsConfig>("/api/ops/tests/config");
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    if (e.status === 401) redirect("/admin/login?next=/admin/operations/tests");
    return (
      <>
        <Head />
        <Notice message={e.status === 403 ? FORBIDDEN_MESSAGE : "운영 테스트 설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."} />
      </>
    );
  }
  if (!config.enabled) {
    return (
      <>
        <Head />
        <Notice message={DISABLED_MESSAGE} />
      </>
    );
  }

  const [current, recent] = await Promise.all([apiFetch<OpsRun | undefined>("/api/ops/tests/current"), apiFetch<OpsRun[]>("/api/ops/tests")]);
  return (
    <>
      <Head />
      <div className="environment-banner">
        <div>
          <strong>테스트 전용 환경에 연결됨</strong>
          <span className="small">실제 고객·운영 DB에는 요청을 보낼 수 없습니다. 서버도 production 대상을 거부합니다.</span>
        </div>
        <span className="environment-chip">{config.environment}</span>
      </div>
      <OpsRunForm limits={config.limits} running={current?.status === "RUNNING"} action={startTest} />
      {current && <OpsLiveRun key={current.id} run={current} stopAction={stopTest} />}
      <RecentRuns runs={recent} />
    </>
  );
}
