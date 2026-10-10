"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", icon: "▦", label: "대시보드" },
  { href: "/admin/popups", icon: "◇", label: "팝업 관리" },
  { href: "/admin/reservations", icon: "☷", label: "예약 관리" },
  { href: "/admin/operations/tests", icon: "⌁", label: "운영 테스트" },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="admin-view">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <Link className="logo" href="/admin">
            Pop<span className="logo-mark">spot</span> <small style={{ fontSize: 11, color: "#8d93a4" }}>ADMIN</small>
          </Link>
          <nav className="admin-nav" aria-label="관리자 메뉴">
            {links.map((link) => (
              <Link key={link.href} href={link.href} aria-label={link.label} aria-current={isActive(pathname, link.href) ? "page" : undefined}>
                <span className="nav-icon" aria-hidden="true">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <div className="admin-main">
          <header className="admin-topbar">
            <Link className="btn btn-secondary btn-sm" href="/">
              고객 화면 보기 ↗
            </Link>
          </header>
          <main className="admin-content" id="main" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
