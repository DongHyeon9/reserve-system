import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { ApiError, apiFetch } from "@/lib/api";

type AdminSession = { id: string; email: string; roles: string[] };

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  let session: AdminSession;
  try {
    session = await apiFetch<AdminSession>("/api/admin/session");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login?next=/admin");
    if (e instanceof ApiError && e.status === 403) {
      return (
        <main className="admin-login" id="main">
          <div className="admin-login-card" role="alert">
            <h1 style={{ fontSize: 26 }}>접근 권한이 없습니다</h1>
            <p className="muted">관리자 권한이 있는 계정으로 다시 로그인해 주세요.</p>
          </div>
        </main>
      );
    }
    // API unreachable or failing: explain instead of crashing into the generic error page. Spring still decides access.
    return (
      <main className="admin-login" id="main">
        <div className="admin-login-card" role="alert">
          <h1 style={{ fontSize: 26 }}>서버에 연결할 수 없습니다</h1>
          <p className="muted">관리자 서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.</p>
          <a className="btn btn-secondary btn-block" href="/admin" style={{ marginTop: 16 }}>다시 시도</a>
        </div>
      </main>
    );
  }
  return <AdminShell email={session.email}>{children}</AdminShell>;
}
