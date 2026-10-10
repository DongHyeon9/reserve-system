// Maps Supabase Auth error codes to the short query-string codes the login page understands.
const SUPABASE_TO_PAGE: Record<string, string> = {
  invalid_credentials: "invalid",
  email_not_confirmed: "unconfirmed",
  weak_password: "weak-password",
  user_already_exists: "exists",
  email_exists: "exists",
  email_address_invalid: "email-invalid",
  email_address_not_authorized: "email-not-authorized",
  over_email_send_rate_limit: "rate-limited",
  over_request_rate_limit: "rate-limited",
  signup_disabled: "signup-disabled",
};

export function authErrorCode(supabaseCode: string | undefined) {
  return (supabaseCode && SUPABASE_TO_PAGE[supabaseCode]) || "unavailable";
}

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid: "이메일 또는 비밀번호를 확인해 주세요.",
  unconfirmed: "이메일 인증이 아직 완료되지 않았습니다. 받은 메일의 링크를 눌러 주세요.",
  "weak-password": "비밀번호는 8자 이상이어야 합니다.",
  exists: "이미 가입된 이메일입니다. 로그인해 주세요.",
  "email-invalid": "사용할 수 없는 이메일 주소입니다. 다른 주소를 입력해 주세요.",
  "email-not-authorized": "현재 인증 메일을 보낼 수 없는 주소입니다. 운영자에게 문의해 주세요.",
  "rate-limited": "인증 메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.",
  "signup-disabled": "현재 신규 가입을 받지 않습니다.",
  callback: "인증 링크가 만료되었거나 올바르지 않습니다. 다시 로그인해 주세요.",
  unavailable: "로그인을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
};
