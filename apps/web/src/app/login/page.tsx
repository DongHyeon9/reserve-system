import Link from "next/link";
import { login } from "@/app/auth-actions";
import { AuthForm } from "@/components/AuthForm";
import { SocialLogin } from "@/components/SocialLogin";
import { enabledProviders } from "@/lib/oauth";
import { AUTH_ERROR_MESSAGES as errors } from "@/lib/auth-errors";
import { devAuthEnabled } from "@/lib/dev-auth";
import { safeNextPath } from "@/lib/session";

export const metadata = { title: "로그인" };

const notices: Record<string, string> = {
  "check-email": "확인 메일을 보냈습니다. 메일의 링크를 누르면 로그인됩니다.",
};

type Search = { next?: string; error?: string; notice?: string; mode?: string };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { next, error, notice, mode } = await searchParams;
  const nextPath = safeNextPath(next);
  const dev = devAuthEnabled();
  const messages = (
    <>
      {error && errors[error] && (
        <div className="notice notice-warning" role="alert"><span>!</span><span>{dev && error === "invalid" ? "이메일 형식을 확인해 주세요." : errors[error]}</span></div>
      )}
      {notice && notices[notice] && (
        <div className="notice notice-info" role="status"><span>i</span><span>{notices[notice]}</span></div>
      )}
    </>
  );
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
          {dev ? <DevLoginForm next={nextPath}>{messages}</DevLoginForm> : (
            <AuthForm
              next={nextPath}
              initialMode={mode === "signup" ? "signup" : "login"}
              social={<SocialLogin providers={enabledProviders()} next={nextPath} loginPath="/login" />}
            >
              {messages}
            </AuthForm>
          )}
        </div>
      </main>
    </div>
  );
}

// Local E2E only (DEV_AUTH_ENABLED=true): passwordless login, the first email used is signed up automatically.
function DevLoginForm({ next, children }: { next: string; children: React.ReactNode }) {
  return (
    <form className="auth-form" action={login}>
      <p className="eyebrow">Welcome back</p>
      <h2 style={{ fontSize: 36 }}>로그인</h2>
      {children}
      <input type="hidden" name="next" value={next} />
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
      <p className="small muted" style={{ marginTop: 20 }}>개발 환경 임시 로그인입니다. 처음 입력한 이메일은 자동으로 가입됩니다.</p>
    </form>
  );
}
