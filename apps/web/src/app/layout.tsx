import type { Metadata } from "next";
import { Black_Han_Sans, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const body = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700", "800", "900"], variable: "--font-body", display: "swap" });
const display = Black_Han_Sans({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Popspot", template: "%s · Popspot" },
  description: "팝업스토어 예약 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${body.variable} ${display.variable}`}>
      <body>
        <a className="skip-link" href="#main">본문으로 건너뛰기</a>
        {children}
      </body>
    </html>
  );
}
