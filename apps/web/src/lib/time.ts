// The API speaks UTC; every user-facing time is converted here and labelled KST.
const TZ = "Asia/Seoul";

const parts = (iso: string, options: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, ...options }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));

/** "15:00" */
export function kstTime(iso: string) {
  const p = parts(iso, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${p.hour}:${p.minute}`;
}

/** "2026-10-18" — calendar day in KST, used to group slots. */
export function kstDateKey(iso: string) {
  const p = parts(iso, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

/** "2026년 10월 18일 일요일" */
export function kstLongDate(iso: string) {
  const p = parts(iso, { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  return `${p.year}년 ${p.month} ${p.day}일 ${p.weekday}`;
}

/** "2026년 10월 18일 일요일 15:00 (KST)" */
export function kstDateTime(iso: string) {
  return `${kstLongDate(iso)} ${kstTime(iso)} (KST)`;
}

/** Weekday letter and day number for a KST date key: { weekday: "일", day: "18" } */
export function kstDayChip(dateKey: string) {
  const p = parts(`${dateKey}T12:00:00+09:00`, { weekday: "short", day: "numeric" });
  return { weekday: p.weekday, day: p.day.replace("일", "") };
}

/** Plain calendar dates (no time zone) "2026-10-18" → "10.18" */
export function shortDate(date: string) {
  const [, month, day] = date.split("-");
  return `${month}.${day}`;
}

/** Days until a KST calendar day, measured from server time: "D-10", "D-DAY". */
export function dDay(targetIso: string, serverNowIso: string) {
  const days = Math.round((Date.parse(kstDateKey(targetIso)) - Date.parse(kstDateKey(serverNowIso))) / 86_400_000);
  return days <= 0 ? "D-DAY" : `D-${days}`;
}
