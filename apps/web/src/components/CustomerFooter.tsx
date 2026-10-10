import Link from "next/link";

export function CustomerFooter() {
  return (
    <footer className="section section-white">
      <div className="container">
        <div className="section-head">
          <div>
            <Link className="logo" href="/">
              Pop<span className="logo-mark">spot</span>
            </Link>
            <p className="small muted">도시의 다음 장면을 예약하세요.</p>
          </div>
          <p className="small muted">
            고객센터 10:00—18:00 · <Link href="/terms">이용약관</Link> · <Link href="/privacy">개인정보처리방침</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
