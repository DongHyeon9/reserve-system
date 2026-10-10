export const metadata = { title: "개인정보처리방침" };

export default function PrivacyPage() {
  return (
    <div className="container">
      <header className="page-hero">
        <p className="eyebrow">Privacy</p>
        <h1>개인정보처리방침</h1>
        <p className="lead">Popspot은 포트폴리오 시연용 서비스이며, 예약에 꼭 필요한 정보만 처리합니다.</p>
      </header>
      <article className="detail-content" style={{ paddingBottom: 48 }}>
        <section>
          <h2>수집하는 정보</h2>
          <ul>
            <li>계정: 이메일, 이름(가입 시 입력하거나 구글·카카오 계정에서 제공받은 값)</li>
            <li>예약: 예약자 이름, 휴대폰 번호, 안내용 이메일, 예약 인원과 회차</li>
          </ul>
        </section>
        <section>
          <h2>이용 목적</h2>
          <p>로그인, 예약 확정·조회·취소, 현장 체크인에만 사용합니다. 광고나 제3자 판매에 사용하지 않습니다.</p>
        </section>
        <section>
          <h2>보관과 보호</h2>
          <ul>
            <li>데이터는 Supabase(PostgreSQL, 서울 리전)에 저장하고 전송 구간은 HTTPS로 암호화합니다.</li>
            <li>운영자 화면에서 연락처는 기본적으로 가려지며, 원문 조회는 기록이 남습니다.</li>
            <li>시연 데이터는 사전 고지 없이 초기화될 수 있습니다.</li>
          </ul>
        </section>
        <section>
          <h2>삭제 요청</h2>
          <p>계정과 예약 정보 삭제를 원하시면 저장소 관리자에게 요청해 주세요. 확인 후 지체 없이 삭제합니다.</p>
        </section>
      </article>
    </div>
  );
}
