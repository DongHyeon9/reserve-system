import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Popspot",
  description: "팝업스토어 예약 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
