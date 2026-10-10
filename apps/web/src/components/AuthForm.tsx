"use client";

import { useState } from "react";
import { login, signup } from "@/app/auth-actions";

/** Supabase email + password form with the design's login / sign-up toggle. */
export function AuthForm({
  next,
  initialMode = "login",
  children,
  social,
}: {
  next: string;
  initialMode?: "login" | "signup";
  children?: React.ReactNode;
  /** Rendered after the form: OAuth buttons are separate forms and cannot be nested inside this one. */
  social?: React.ReactNode;
}) {
  const [mode, setMode] = useState(initialMode);
  const signingUp = mode === "signup";
  return (
    <div className="auth-form">
    <form action={signingUp ? signup : login}>
      <p className="eyebrow">{signingUp ? "Join Popspot" : "Welcome back"}</p>
      <h2 style={{ fontSize: 36 }}>{signingUp ? "회원가입" : "로그인"}</h2>
      <p className="muted">
        {signingUp ? "이미 계정이 있나요?" : "처음이신가요?"}{" "}
        <button className="text-link" type="button" onClick={() => setMode(signingUp ? "login" : "signup")}>
          {signingUp ? "로그인하기" : "30초 만에 가입하기"}
        </button>
      </p>
      {children}
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="loginPath" value="/login" />
      {signingUp && (
        <div className="field">
          <label htmlFor="name">이름</label>
          <input className="input" id="name" name="name" placeholder="이름 입력" autoComplete="name" required maxLength={50} />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">이메일</label>
        <input className="input" id="email" name="email" type="email" placeholder="hello@example.com" autoComplete="email" required maxLength={254} />
      </div>
      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          placeholder="8자 이상 입력"
          autoComplete={signingUp ? "new-password" : "current-password"}
          required
          minLength={signingUp ? 8 : undefined}
          maxLength={72}
        />
      </div>
      <button className="btn btn-primary btn-block" type="submit">{signingUp ? "가입하고 계속" : "로그인하고 계속"}</button>
    </form>
      {social}
      <p className="small muted" style={{ marginTop: 20 }}>계속하면 Popspot의 이용약관과 개인정보처리방침에 동의하게 됩니다.</p>
    </div>
  );
}
