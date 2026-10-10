import Link from "next/link";
import { PopupCard } from "@/components/PopupCard";
import { apiFetch } from "@/lib/api";
import type { PageResponse, PopupSummary } from "@/lib/types";

export default async function Home() {
  // The home page must render even when the API is down; the trending section is simply omitted.
  const trending = await apiFetch<PageResponse<PopupSummary>>("/api/popups?page=0&size=3")
    .then((page) => page.items)
    .catch(() => []);
  return (
    <>
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
      {trending.length > 0 && (
        <section className="section section-white">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Trending now</p>
                <h2>지금 가장 많이 예약해요</h2>
              </div>
              <Link className="text-link" href="/popups">전체 보기 →</Link>
            </div>
            <div className="card-grid">
              {trending.map((popup) => <PopupCard key={popup.id} popup={popup} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
