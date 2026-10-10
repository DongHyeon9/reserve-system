export const metadata = { title: "이용약관" };

export default function TermsPage() {
  return (
    <div className="container">
      <header className="page-hero">
        <p className="eyebrow">Terms</p>
        <h1>이용약관</h1>
        <p className="lead">Popspot은 팝업스토어 예약 흐름을 보여 주기 위한 포트폴리오 시연 서비스입니다.</p>
      </header>
      <article className="detail-content" style={{ paddingBottom: 48 }}>
        <section>
          <h2>서비스 성격</h2>
          <p>표시되는 팝업과 회차는 시연용 데이터이며, 실제 방문이나 상품 제공을 보장하지 않습니다.</p>
        </section>
        <section>
          <h2>예약과 취소</h2>
          <ul>
            <li>예약은 회차 정원 안에서 선착순으로 확정됩니다.</li>
            <li>각 팝업에 표시된 기한까지 무료로 취소할 수 있습니다.</li>
          </ul>
        </section>
        <section>
          <h2>금지 행위</h2>
          <p>자동화된 대량 요청, 타인 정보로 예약하기, 서비스 운영을 방해하는 행위를 금지합니다.</p>
        </section>
        <section>
          <h2>변경</h2>
          <p>약관이 바뀌면 이 페이지에 게시합니다.</p>
        </section>
      </article>
    </div>
  );
}
