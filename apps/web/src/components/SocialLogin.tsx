import { oauthLogin } from "@/app/auth-actions";
import { OAUTH_LABELS, type OAuthProvider } from "@/lib/oauth";

export function SocialLogin({ providers, next, loginPath }: { providers: OAuthProvider[]; next: string; loginPath: "/login" | "/admin/login" }) {
  if (providers.length === 0) return null;
  return (
    <div>
      <div className="divider">또는</div>
      {providers.map((provider) => (
        <form key={provider} action={oauthLogin}>
          <input type="hidden" name="provider" value={provider} />
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="loginPath" value={loginPath} />
          <button className={`btn btn-block ${provider === "kakao" ? "btn-kakao" : "btn-secondary"}`} type="submit">
            {OAUTH_LABELS[provider]}
          </button>
        </form>
      ))}
    </div>
  );
}
