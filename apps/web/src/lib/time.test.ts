import { expect, test } from "vitest";
import { addDays, dDay, isoToKstLocalInput, kstDateKey, kstDateTime, kstDayChip, kstLocalInputToIso, kstMonthDayTime, kstTime, longDate, shortDate } from "./time";

test("UTC instants are shown in KST regardless of the machine time zone", () => {
  expect(kstTime("2026-10-18T06:00:00Z")).toBe("15:00");
  expect(kstDateTime("2026-10-20T05:00:00Z")).toBe("2026년 10월 20일 화요일 14:00 (KST)");
});

test("KST date boundary: 15:00Z is already the next day in Seoul", () => {
  expect(kstDateKey("2026-10-17T14:59:59Z")).toBe("2026-10-17");
  expect(kstDateKey("2026-10-17T15:00:00Z")).toBe("2026-10-18");
  expect(kstTime("2026-10-17T15:00:00Z")).toBe("00:00");
});

test("date chips and short dates", () => {
  expect(kstDayChip("2026-10-18")).toEqual({ weekday: "일", day: "18" });
  expect(shortDate("2026-11-03")).toBe("11.03");
});

test("D-day counts KST calendar days from server time", () => {
  expect(dDay("2026-10-20T05:00:00Z", "2026-10-10T03:00:00Z")).toBe("D-10");
  expect(dDay("2026-10-20T05:00:00Z", "2026-10-19T15:30:00Z")).toBe("D-DAY");
  expect(dDay("2026-10-20T05:00:00Z", "2026-10-21T00:00:00Z")).toBe("D-DAY");
});

test("month-day labels drop leading zeros", () => {
  expect(kstMonthDayTime("2026-10-20T05:00:00Z")).toBe("10월 20일 14:00");
  expect(longDate("2026-11-03")).toBe("2026년 11월 3일");
});

test("KST datetime-local inputs round-trip through UTC, including KST midnight", () => {
  expect(kstLocalInputToIso("2026-10-20T14:00")).toBe("2026-10-20T14:00:00+09:00");
  expect(isoToKstLocalInput("2026-10-20T05:00:00Z")).toBe("2026-10-20T14:00");
  // 00:00 KST is 15:00Z of the previous UTC day.
  expect(isoToKstLocalInput("2026-10-19T15:00:00Z")).toBe("2026-10-20T00:00");
  const iso = kstLocalInputToIso("2026-10-20T00:00")!;
  expect(new Date(iso).toISOString()).toBe("2026-10-19T15:00:00.000Z");
  expect(isoToKstLocalInput(new Date(iso).toISOString())).toBe("2026-10-20T00:00");
  expect(kstLocalInputToIso("")).toBeNull();
  expect(kstLocalInputToIso("2026-10-20 14:00")).toBeNull();
  expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
});
