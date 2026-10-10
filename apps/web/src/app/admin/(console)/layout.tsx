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
    throw e;
  }
  return <AdminShell email={session.email}>{children}</AdminShell>;
}
