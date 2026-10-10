import Link from "next/link";
import { login } from "@/app/auth-actions";
import { safeNextPath } from "@/lib/session";

export const metadata = { title: "로그인" };

const errors: Record<string, string> = {
  unavailable: "로그인을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  invalid: "이메일 형식을 확인해 주세요.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="customer-view">
      <main className="auth-shell" id="main">
        <div className="auth-visual">
          <Link className="logo" href="/" style={{ color: "white" }}>
            Pop<span style={{ color: "#ff7a82" }}>spot</span>
          </Link>
          <div>
            <p className="eyebrow" style={{ color: "#ffbec2" }}>Your next scene</p>
            <h1>예약하던 곳으로<br />바로 돌아갈게요.</h1>
            <p className="lead" style={{ color: "#dadcf0" }}>로그인하면 예약 확정과 내역 관리를 한 번에 할 수 있어요.</p>
          </div>
        </div>
        <div className="auth-form-wrap">
          <form className="auth-form" action={login}>
            <p className="eyebrow">Welcome back</p>
            <h2 style={{ fontSize: 36 }}>로그인</h2>
            {error && errors[error] && (
              <div className="notice notice-warning" role="alert"><span>!</span><span>{errors[error]}</span></div>
            )}
            <input type="hidden" name="next" value={safeNextPath(next)} />
            <input type="hidden" name="loginPath" value="/login" />
            <div className="field">
              <label htmlFor="email">이메일</label>
              <input className="input" id="email" name="email" type="email" placeholder="hello@example.com" autoComplete="email" required maxLength={254} />
            </div>
            <div className="field">
              <label htmlFor="name">이름 (선택)</label>
              <input className="input" id="name" name="name" placeholder="이름 입력" autoComplete="name" maxLength={50} />
            </div>
            <button className="btn btn-primary btn-block" type="submit">로그인하고 계속</button>
            {/* TEMP: dev login has no password. Supabase email/password replaces this form (todo/01-supabase.md). */}
            <p className="small muted" style={{ marginTop: 20 }}>개발 환경 임시 로그인입니다. 처음 입력한 이메일은 자동으로 가입됩니다.</p>
          </form>
        </div>
      </main>
    </div>
  );
}
