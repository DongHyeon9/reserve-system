import Link from "next/link";
import { login } from "@/app/auth-actions";
import { devAuthEnabled } from "@/lib/dev-auth";
import { safeNextPath } from "@/lib/session";

export const metadata = { title: "관리자 로그인" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="admin-login" id="main">
      <form className="admin-login-card" action={login}>
        <Link className="logo" href="/">
          Pop<span className="logo-mark">spot</span> <small style={{ fontSize: 12, color: "var(--muted)" }}>ADMIN</small>
        </Link>
        <h1 style={{ fontSize: 30 }}>관리자 로그인</h1>
        <p className="muted">승인된 운영 계정으로만 접근할 수 있습니다.</p>
        {error && (
          <div className="notice notice-warning" role="alert"><span>!</span><span>로그인하지 못했습니다. 입력값을 확인해 주세요.</span></div>
        )}
        <input type="hidden" name="next" value={safeNextPath(next, "/admin")} />
        <input type="hidden" name="loginPath" value="/admin/login" />
        <div className="field" style={{ marginTop: 24 }}>
          <label htmlFor="admin-email">이메일</label>
          <input className="input" id="admin-email" name="email" type="email" autoComplete="email" required maxLength={254} />
        </div>
        {/* The local E2E dev login (DEV_AUTH_ENABLED=true) is passwordless; real admins sign in with their Supabase password. */}
        {!devAuthEnabled() && (
          <div className="field">
            <label htmlFor="admin-password">비밀번호</label>
            <input className="input" id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={72} />
          </div>
        )}
        <button className="btn btn-primary btn-block" style={{ marginTop: 22 }} type="submit">관리자 로그인</button>
        <div className="notice notice-warning" style={{ marginTop: 18 }}>
          <span>!</span>
          <span>관리자 권한은 서버에서 확인합니다. 공용 기기에서는 사용 후 로그아웃하세요.</span>
        </div>
      </form>
    </main>
  );
}
