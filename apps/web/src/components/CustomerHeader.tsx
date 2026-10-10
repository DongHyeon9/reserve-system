"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/popups", label: "팝업 둘러보기" },
  { href: "/reservations", label: "내 예약" },
];

export function CustomerHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="logo" href="/">
          Pop<span className="logo-mark">spot</span>
        </Link>
        <nav className="main-nav" aria-label="주요 메뉴">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname.startsWith(link.href) ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="btn btn-secondary btn-sm" href="/login">
            로그인
          </Link>
        </div>
      </div>
    </header>
  );
}
