import Link from "next/link";

export default function Home() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">This week in Seoul</p>
          <h1>
            이번 주말,
            <br />
            어디에 빠져볼까요?
          </h1>
          <p className="lead">지금 서울에서 가장 흥미로운 팝업을 발견하고, 기다림 없이 내 시간을 예약하세요.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/popups">팝업 둘러보기</Link>
            <Link className="btn btn-secondary" href="/reservations">내 예약 확인</Link>
          </div>
          <div className="trust-row">
            <span>예약 수수료 없음</span>
            <span>실시간 잔여석</span>
            <span>간편 취소</span>
          </div>
        </div>
        <div className="poster-stack" role="img" aria-label="추천 팝업 포스터">
          <div className="poster poster-main">
            <div className="poster-content"><small>SEONGSU</small><strong>Tiny<br />Garden</strong></div>
          </div>
          <div className="poster poster-small">
            <div className="poster-content"><small>HANNAM</small><strong>Night<br />Archive</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}
