const screens = [
  "home",
  "popups",
  "popup-detail",
  "popup-waiting",
  "auth",
  "reserve",
  "reserve-complete",
  "my-reservations",
  "reservation-detail",
  "admin-login",
  "admin-dashboard",
  "admin-popups",
  "admin-popup-form",
  "admin-slots",
  "admin-reservations",
  "admin-reservation-detail",
  "admin-debug",
];

const popupCards = [
  {
    art: "art-red",
    label: "Tiny Garden",
    area: "성수 · 라이프스타일",
    title: "도심 속 작은 정원",
    date: "10.18 — 11.03",
    badge: "마감 임박",
    badgeClass: "badge-warning",
    seats: "오늘 6석",
  },
  {
    art: "art-blue",
    label: "Night Archive",
    area: "한남 · 패션",
    title: "나이트 아카이브 서울",
    date: "10.24 — 11.10",
    badge: "예약 가능",
    badgeClass: "badge-success",
    seats: "주말 24석",
  },
  {
    art: "art-green",
    label: "Slow Table",
    area: "연남 · 푸드",
    title: "슬로우 테이블 마켓",
    date: "10.12 — 10.27",
    badge: "예약 가능",
    badgeClass: "badge-success",
    seats: "오늘 18석",
  },
  {
    art: "art-orange",
    label: "Loop Lab",
    area: "성수 · 테크",
    title: "루프 랩 체험 전시",
    date: "11.01 — 11.17",
    badge: "오픈 대기",
    badgeClass: "badge-warning",
    seats: "10.20 14:00 KST 오픈",
    waiting: true,
  },
  {
    art: "art-purple",
    label: "Soft Noise",
    area: "이태원 · 뮤직",
    title: "소프트 노이즈 리스닝룸",
    date: "10.16 — 10.30",
    badge: "매진",
    badgeClass: "badge-neutral",
    seats: "대기 가능",
  },
  {
    art: "art-yellow",
    label: "Object 101",
    area: "서촌 · 디자인",
    title: "오브젝트 101",
    date: "10.20 — 11.08",
    badge: "예약 가능",
    badgeClass: "badge-success",
    seats: "평일 여유",
  },
];

function customerHeader(active = "") {
  return `
    <header class="site-header">
      <div class="header-inner">
        <a class="logo" href="#home">Pop<span class="logo-mark">spot</span></a>
        <nav class="main-nav" aria-label="주요 메뉴">
          <a href="#popups" ${active === "popups" ? 'aria-current="page"' : ""}>팝업 둘러보기</a>
          <a href="#my-reservations" ${active === "my" ? 'aria-current="page"' : ""}>내 예약</a>
        </nav>
        <div class="header-actions">
          <button class="icon-button" type="button" aria-label="검색" data-toast="검색 화면은 구현 단계에서 연결합니다">⌕</button>
          <a class="btn btn-secondary btn-sm" href="#auth">로그인</a>
        </div>
      </div>
    </header>`;
}

function customerFooter() {
  return `
    <footer class="section section-white">
      <div class="container">
        <div class="section-head">
          <div><a class="logo" href="#home">Pop<span class="logo-mark">spot</span></a><p class="small muted">도시의 다음 장면을 예약하세요.</p></div>
          <p class="small muted">고객센터 10:00—18:00 · 이용약관 · 개인정보처리방침</p>
        </div>
      </div>
    </footer>`;
}

function popupCard(card) {
  return `
    <article class="popup-card">
      <div class="card-art ${card.art}" role="img" aria-label="${card.title} 포스터 이미지">
        <span class="art-label">${card.label}</span>
      </div>
      <div class="card-body">
        <div class="card-kicker"><span>${card.area}</span><span class="badge ${card.badgeClass}">${card.badge}</span></div>
        <h3>${card.title}</h3>
        <p class="card-meta tabular">${card.date}</p>
        <div class="card-footer"><span class="small strong">${card.seats}</span><a class="text-link" href="#${card.waiting ? "popup-waiting" : "popup-detail"}">${card.waiting ? "오픈 일정 보기" : "상세 보기"} →</a></div>
      </div>
    </article>`;
}

function homePage() {
  return `${customerHeader("home")}
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">This week in Seoul</p>
          <h1>이번 주말,<br>어디에 빠져볼까요?</h1>
          <p class="lead">지금 서울에서 가장 흥미로운 팝업을 발견하고, 기다림 없이 내 시간을 예약하세요.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#popups">팝업 둘러보기</a>
            <a class="btn btn-secondary" href="#my-reservations">내 예약 확인</a>
          </div>
          <div class="trust-row"><span>예약 수수료 없음</span><span>실시간 잔여석</span><span>간편 취소</span></div>
        </div>
        <div class="poster-stack" role="img" aria-label="추천 팝업 포스터">
          <div class="poster poster-main"><div class="poster-content"><small>SEONGSU · 10.18—11.03</small><strong>Tiny<br>Garden</strong></div></div>
          <div class="poster poster-small"><div class="poster-content"><small>HANNAM</small><strong>Night<br>Archive</strong></div></div>
        </div>
      </div>
    </section>
    <section class="section section-white">
      <div class="container">
        <div class="section-head"><div><p class="eyebrow">Trending now</p><h2>지금 가장 많이 예약해요</h2></div><a class="text-link" href="#popups">전체 보기 →</a></div>
        <div class="card-grid">${popupCards.slice(0, 3).map(popupCard).join("")}</div>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="section-head"><div><p class="eyebrow">Explore by mood</p><h2>오늘의 기분으로 골라보세요</h2></div></div>
        <div class="chip-row"><a class="chip chip-active" href="#popups">새로운 영감</a><a class="chip" href="#popups">맛있는 하루</a><a class="chip" href="#popups">사진 남기기</a><a class="chip" href="#popups">혼자 천천히</a><a class="chip" href="#popups">친구와 함께</a></div>
      </div>
    </section>${customerFooter()}`;
}

function popupsPage() {
  return `${customerHeader("popups")}
    <div class="container">
      <header class="page-hero"><div class="breadcrumbs"><span>홈</span><span>팝업 둘러보기</span></div><p class="eyebrow">Discover</p><h1>취향에 맞는 팝업 찾기</h1><p class="lead">지역, 날짜, 카테고리로 지금 예약 가능한 공간을 찾아보세요.</p></header>
      <form class="filter-panel" data-demo-form>
        <div class="field"><label for="popup-search">팝업 검색</label><input class="input" id="popup-search" type="search" placeholder="브랜드 또는 팝업 이름" /></div>
        <div class="field"><label for="area">지역</label><select class="select" id="area"><option>전체 지역</option><option>성수</option><option>한남</option><option>연남</option></select></div>
        <div class="field"><label for="date">날짜</label><input class="input" id="date" type="date" value="2026-10-18" /></div>
        <div class="field"><label for="category">카테고리</label><select class="select" id="category"><option>전체 카테고리</option><option>패션</option><option>라이프스타일</option><option>푸드</option></select></div>
        <button class="btn btn-primary" type="submit">검색</button>
      </form>
      <div class="result-summary"><div><strong>서울 팝업 24개</strong><div class="chip-row"><button class="chip chip-active" type="button">예약 가능 ×</button><button class="chip" type="button">이번 주말</button></div></div><select class="select" aria-label="정렬"><option>추천순</option><option>마감 임박순</option><option>최신순</option></select></div>
      <div class="card-grid">${popupCards.map(popupCard).join("")}</div>
      <div class="section" style="text-align:center"><button class="btn btn-secondary" type="button" data-toast="다음 결과를 불러왔습니다">더 보기</button></div>
    </div>${customerFooter()}`;
}

function popupDetailPage() {
  return `${customerHeader("popups")}
    <div class="container">
      <div class="page-hero"><div class="breadcrumbs"><span>홈</span><span>팝업</span><span>도심 속 작은 정원</span></div></div>
      <div class="detail-hero-art" role="img" aria-label="도심 속 작은 정원 팝업의 빨간색과 주황색 그래픽 포스터">
        <div class="detail-art-copy"><p>SEONGSU · LIFESTYLE</p><strong>Tiny Garden</strong></div>
      </div>
      <div class="detail-layout">
        <article class="detail-content">
          <p class="eyebrow">10.18 — 11.03</p><h1>도심 속 작은 정원</h1><p class="lead">바쁜 도시 한가운데서 식물과 향, 차를 천천히 경험하는 40분의 휴식입니다.</p>
          <section><h2>팝업 정보</h2><dl class="info-list"><dt>운영 기간</dt><dd>2026년 10월 18일 — 11월 3일</dd><dt>운영 시간</dt><dd>매일 11:00 — 20:00 (KST)</dd><dt>장소</dt><dd>서울 성동구 연무장길 42, 1층</dd><dt>관람 시간</dt><dd>약 40분</dd></dl></section>
          <section><h2>공간 소개</h2><p>세 가지 테마의 작은 정원을 거닐며 계절의 향과 차를 만납니다. 예약자에게는 현장에서 식물 카드와 시음 차가 제공됩니다.</p><div class="notice notice-info"><span>ⓘ</span><span>사진 촬영은 가능하지만 플래시와 삼각대 사용은 어렵습니다.</span></div></section>
          <section><h2>취소 안내</h2><p>방문 24시간 전까지 무료로 취소할 수 있습니다. 이후 취소 또는 미방문 시 재예약이 제한될 수 있습니다.</p></section>
        </article>
        <aside class="reservation-panel" aria-label="예약 일정 선택">
          <div class="card-footer"><h2 style="font-size:20px;margin:0">날짜와 시간</h2><span class="badge badge-warning">잔여 6석</span></div>
          <div class="date-row"><button class="choice" type="button" aria-pressed="false" data-date="2026년 10월 16일 금요일"><span>금</span><strong>16</strong></button><button class="choice" type="button" aria-pressed="false" data-date="2026년 10월 17일 토요일"><span>토</span><strong>17</strong></button><button class="choice choice-active" type="button" aria-pressed="true" data-date="2026년 10월 18일 일요일"><span>일</span><strong>18</strong></button><button class="choice" type="button" aria-pressed="false" data-date="2026년 10월 19일 월요일"><span>월</span><strong>19</strong></button></div>
          <p class="field-label">2026년 10월 18일 일요일 · KST</p>
          <div class="slot-grid"><button class="choice choice-soldout" type="button" aria-pressed="false" disabled><strong>11:00</strong><span>매진</span></button><button class="choice" type="button" aria-pressed="false"><strong>13:00</strong><span>3석 남음</span></button><button class="choice choice-active" type="button" aria-pressed="true"><strong>15:00</strong><span>6석 남음</span></button><button class="choice" type="button" aria-pressed="false"><strong>17:00</strong><span>12석 남음</span></button></div>
          <a class="btn btn-primary btn-block" id="reserve-cta" href="#auth">15:00 예약하기</a><p class="small muted" style="text-align:center;margin:10px 0 0">예약 수수료 없이 바로 확정됩니다.</p>
        </aside>
      </div>
    </div>${customerFooter()}`;
}

function popupWaitingPage() {
  return `${customerHeader("popups")}
    <div class="container">
      <div class="page-hero"><div class="breadcrumbs"><span>홈</span><span>팝업</span><span>루프 랩 체험 전시</span></div></div>
      <div class="detail-hero-art art-orange" role="img" aria-label="루프 랩 체험 전시의 주황색 그래픽 포스터" style="background:linear-gradient(125deg,#ef8347 0 46%,#a94228 46% 72%,#192153 72%)">
        <div class="detail-art-copy"><p>SEONGSU · TECH</p><strong>Loop Lab</strong></div>
      </div>
      <div class="detail-layout">
        <article class="detail-content">
          <div class="card-footer"><p class="eyebrow">11.01 — 11.17</p><span class="badge badge-warning">오픈 대기</span></div>
          <h1>루프 랩 체험 전시</h1><p class="lead">움직임과 소리가 실시간으로 연결되는 인터랙티브 미디어 전시입니다.</p>
          <section><h2>예약 오픈 안내</h2><div class="scheduled-box"><strong>2026년 10월 20일 화요일 14:00 (KST)</strong><span>서버 시간을 기준으로 예약이 자동으로 열립니다.</span></div></section>
          <section><h2>팝업 정보</h2><dl class="info-list"><dt>운영 기간</dt><dd>2026년 11월 1일 — 11월 17일</dd><dt>운영 시간</dt><dd>매일 12:00 — 21:00 (KST)</dd><dt>장소</dt><dd>서울 성동구 성수이로18길 7</dd><dt>관람 시간</dt><dd>약 60분</dd></dl></section>
          <section><h2>미리 알아두세요</h2><p>예약 오픈 전에는 회차를 선택하거나 예약할 수 없습니다. 오픈 시각에 화면이 자동으로 갱신되며, 브라우저 시간이 아닌 서버 상태를 기준으로 예약 가능 여부가 결정됩니다.</p></section>
        </article>
        <aside class="reservation-panel" aria-label="예약 오픈 일정">
          <div class="card-footer"><h2 style="font-size:20px;margin:0">예약 오픈 대기</h2><span class="badge badge-warning">D-10</span></div>
          <div class="notice notice-warning" style="margin:18px 0"><span>◷</span><span><strong>10월 20일 14:00 (KST)</strong><br>해당 시각부터 날짜와 회차를 선택할 수 있어요.</span></div>
          <div class="date-row" aria-hidden="true"><button class="choice" type="button" disabled><span>일</span><strong>1</strong></button><button class="choice" type="button" disabled><span>월</span><strong>2</strong></button><button class="choice" type="button" disabled><span>화</span><strong>3</strong></button><button class="choice" type="button" disabled><span>수</span><strong>4</strong></button></div>
          <button class="btn btn-primary btn-block" type="button" disabled>10월 20일 14:00 오픈</button><p class="small muted" style="text-align:center;margin:10px 0 0">오픈 전 예약 요청은 서버에서 차단됩니다.</p>
        </aside>
      </div>
    </div>${customerFooter()}`;
}

function authPage() {
  return `<section class="auth-shell">
    <div class="auth-visual"><a class="logo" href="#home" style="color:white">Pop<span style="color:#ff7a82">spot</span></a><div><p class="eyebrow" style="color:#ffbec2">Your next scene</p><h1>예약하던 곳으로<br>바로 돌아갈게요.</h1><p class="lead" style="color:#dadcf0">로그인하면 예약 확정과 내역 관리를 한 번에 할 수 있어요.</p></div></div>
    <div class="auth-form-wrap"><form class="auth-form" data-demo-form>
      <p class="eyebrow" id="auth-eyebrow">Welcome back</p><h1 id="auth-title" style="font-size:36px">로그인</h1>
      <p class="muted" id="auth-switch-copy"><span id="auth-switch-lead">처음이신가요?</span> <button class="text-link" id="auth-toggle" type="button" data-auth-toggle>30초 만에 가입하기</button></p>
      <div class="field" id="signup-name-field" hidden><label for="signup-name">이름</label><input class="input" id="signup-name" placeholder="이름 입력" /></div>
      <div class="field"><label for="email">이메일</label><input class="input" id="email" type="email" placeholder="hello@example.com" required /></div>
      <div class="field"><label for="password">비밀번호</label><input class="input" id="password" type="password" placeholder="8자 이상 입력" required /></div>
      <div class="card-footer" id="login-options"><label class="check-row small"><input type="checkbox" /> 로그인 유지</label><button class="text-link btn-ghost" type="button" data-toast="비밀번호 재설정 메일을 보내드립니다">비밀번호 찾기</button></div>
      <button class="btn btn-primary btn-block" id="auth-submit" type="submit" data-route="reserve">로그인하고 예약 계속</button>
      <div class="divider">또는</div><button class="btn btn-secondary btn-block" type="button" data-toast="소셜 로그인은 구현 단계에서 연결합니다">간편 로그인</button><p class="small muted" style="margin-top:20px">계속하면 Popspot의 이용약관과 개인정보처리방침에 동의하게 됩니다.</p>
    </form></div>
  </section>`;
}

function reservePage() {
  return `${customerHeader("popups")}<div class="container">
    <header class="page-hero"><div class="breadcrumbs"><span>팝업 상세</span><span>예약</span></div><p class="eyebrow">Reservation</p><h1>예약 정보 확인</h1><div class="stepper" role="list" aria-label="예약 단계"><div class="step step-done" role="listitem">1. 회차 선택 ✓</div><div class="step step-active" role="listitem" aria-current="step">2. 예약 정보</div><div class="step" role="listitem">3. 완료</div></div></header>
    <form class="reserve-layout" data-demo-form>
      <div>
        <section class="form-card"><h2>예약 인원</h2><div class="counter"><div><strong>일반 방문자</strong><div class="small muted">최대 4명까지 예약 가능</div></div><div class="counter-control"><button type="button" data-count="minus" aria-label="인원 줄이기">−</button><strong id="guest-count" aria-live="polite">2</strong><button type="button" data-count="plus" aria-label="인원 늘리기">＋</button></div></div></section>
        <section class="form-card"><h2>예약자 정보</h2><div class="form-grid"><div class="field"><label for="guest-name">이름</label><input class="input" id="guest-name" value="김팝업" required /></div><div class="field"><label for="guest-phone">휴대폰 번호</label><input class="input" id="guest-phone" value="010-1234-5678" required /></div></div><div class="field" style="margin-top:16px"><label for="guest-email">예약 안내 이메일</label><input class="input" id="guest-email" type="email" value="popup@example.com" required /></div></section>
        <section class="form-card"><h2>약관 동의</h2><label class="check-row"><input type="checkbox" required /><span><strong>필수 약관에 모두 동의합니다.</strong><br><span class="small muted">개인정보 수집 및 예약 취소 정책</span></span></label><label class="check-row"><input type="checkbox" /><span>새로운 팝업 소식 수신 동의 (선택)</span></label></section>
      </div>
      <aside class="summary-card"><div class="summary-art">Tiny Garden</div><h3 style="margin-top:16px">도심 속 작은 정원</h3><ul class="summary-list"><li><span>날짜</span><strong>2026.10.18 (일)</strong></li><li><span>시간</span><strong>15:00</strong></li><li><span>인원</span><strong id="summary-count">2명</strong></li><li><span>장소</span><strong>성수 연무장길 42</strong></li><li><span>결제</span><strong>무료</strong></li></ul><button class="btn btn-primary btn-block" type="submit" data-route="reserve-complete">예약 확정</button><p class="small muted" style="text-align:center;margin:10px 0 0">버튼을 누르면 예약이 즉시 확정됩니다.</p></aside>
    </form>
  </div>`;
}

function reserveCompletePage() {
  return `${customerHeader("my")}<div class="success-wrap"><div class="success-icon">✓</div><p class="eyebrow">Reservation confirmed</p><h1>예약이 완료됐어요!</h1><p class="lead" style="margin-inline:auto">2026년 10월 18일 오후 3시, 작은 정원에서 만나요.</p><article class="ticket"><div class="ticket-head"><div><span class="badge badge-success">예약 확정</span><h2 style="margin:14px 0 4px">도심 속 작은 정원</h2><p class="muted">성수 · Tiny Garden</p><div class="booking-code tabular">PS-261018-0427</div></div><div class="qr-placeholder" role="img" aria-label="체크인 QR 코드 자리"></div></div><dl class="info-list" style="margin-top:22px"><dt>일시</dt><dd>2026년 10월 18일 일요일, 15:00 (KST)</dd><dt>인원</dt><dd>2명</dd><dt>장소</dt><dd>서울 성동구 연무장길 42, 1층</dd></dl></article><div class="hero-actions" style="justify-content:center"><a class="btn btn-primary" href="#reservation-detail">예약 상세 보기</a><a class="btn btn-secondary" href="#home">홈으로</a></div><p class="small muted">예약 확인 이메일을 popup@example.com으로 보냈습니다.</p></div>${customerFooter()}`;
}

function myReservationsPage() {
  return `${customerHeader("my")}<div class="container"><header class="page-hero"><p class="eyebrow">My reservations</p><h1>내 예약</h1><p class="lead">예정된 방문과 지난 기록을 한곳에서 확인하세요.</p></header><div class="tabs" role="group" aria-label="예약 상태 필터"><button class="tab tab-active" type="button" aria-pressed="true" data-booking-tab>예정 2</button><button class="tab" type="button" aria-pressed="false" data-booking-tab>지난 예약 4</button><button class="tab" type="button" aria-pressed="false" data-booking-tab>취소 1</button></div><div class="booking-list">
    <article class="booking-card"><div class="booking-date"><span class="small muted">10월</span><strong>18</strong><span class="small">일요일</span></div><div><span class="badge badge-success">예약 확정</span><h3 style="margin:8px 0 2px">도심 속 작은 정원</h3><p class="card-meta">15:00 · 2명 · 성수</p><span class="small muted tabular">PS-261018-0427</span></div><a class="btn btn-secondary" href="#reservation-detail">예약 상세</a></article>
    <article class="booking-card"><div class="booking-date"><span class="small muted">10월</span><strong>25</strong><span class="small">일요일</span></div><div><span class="badge badge-warning">방문 임박</span><h3 style="margin:8px 0 2px">나이트 아카이브 서울</h3><p class="card-meta">19:30 · 1명 · 한남</p><span class="small muted tabular">PS-261025-1182</span></div><a class="btn btn-secondary" href="#reservation-detail">예약 상세</a></article>
    </div><section class="section"><div class="notice notice-info"><span>ⓘ</span><span>예약 시간 10분 전부터 QR 체크인이 가능합니다.</span></div></section></div>${customerFooter()}`;
}

function reservationDetailPage() {
  return `${customerHeader("my")}<div class="container"><header class="page-hero"><div class="breadcrumbs"><span>내 예약</span><span>PS-261018-0427</span></div><div class="card-footer"><div><p class="eyebrow">Reservation detail</p><h1>예약 상세</h1></div><span class="badge badge-success" id="booking-status" tabindex="-1">예약 확정</span></div></header><div class="reserve-layout"><article><section class="content-card"><div class="ticket-head"><div><h2>도심 속 작은 정원</h2><p class="muted">성수 · Tiny Garden</p><div class="booking-code tabular">PS-261018-0427</div></div><div class="qr-placeholder" role="img" aria-label="체크인 QR 코드 자리"></div></div><dl class="info-list" style="margin-top:24px"><dt>방문 일시</dt><dd>2026년 10월 18일 일요일, 15:00 (KST)</dd><dt>예약 인원</dt><dd>2명</dd><dt>예약자</dt><dd>김팝업 · 010-12**-56**</dd><dt>장소</dt><dd>서울 성동구 연무장길 42, 1층</dd></dl></section><section class="content-card" style="margin-top:16px"><h2>방문 안내</h2><ul><li>예약 시간 10분 전부터 입장할 수 있습니다.</li><li>현장에서 QR 코드 또는 예약번호를 보여주세요.</li><li>주차 공간이 없어 대중교통 이용을 권장합니다.</li></ul></section></article><aside><section class="summary-card"><h3>예약 관리</h3><p class="small muted">2026년 10월 17일 15:00 (KST)까지 무료 취소할 수 있습니다.</p><button class="btn btn-danger btn-block" id="cancel-booking" type="button" data-cancel-open>예약 취소</button><button class="btn btn-ghost btn-block" type="button" data-toast="일정 변경은 취소 후 다시 예약할 수 있습니다">일정 변경 안내</button></section></aside></div></div><dialog id="cancel-dialog"><div class="dialog-body"><p class="eyebrow">Cancel reservation</p><h2>예약을 취소할까요?</h2><p class="muted">취소하면 선택한 회차의 좌석이 즉시 반환됩니다. 이 작업은 되돌릴 수 없습니다.</p></div><div class="dialog-actions"><button class="btn btn-secondary" type="button" data-dialog-close>돌아가기</button><button class="btn btn-danger" type="button" data-cancel-confirm>예약 취소 확인</button></div></dialog>${customerFooter()}`;
}

function adminNav(active) {
  const links = [
    ["admin-dashboard", "▦", "대시보드"],
    ["admin-popups", "◇", "팝업 관리"],
    ["admin-slots", "◷", "회차·정원"],
    ["admin-reservations", "☷", "예약 관리"],
    ["admin-debug", "⌁", "운영 테스트"],
  ];
  return `<aside class="admin-sidebar"><a class="logo" href="#admin-dashboard">Pop<span class="logo-mark">spot</span> <small style="font-size:11px;color:#8d93a4">ADMIN</small></a><nav class="admin-nav" aria-label="관리자 메뉴">${links.map(([route, icon, label]) => `<a href="#${route}" aria-label="${label}" ${active === route ? 'aria-current="page"' : ""}><span class="nav-icon">${icon}</span><span>${label}</span></a>`).join("")}</nav><div class="admin-profile"><span class="avatar">PS</span><div><strong class="small">운영 관리자</strong><div style="font-size:11px;color:#8d93a4">admin@popspot.kr</div></div></div></aside>`;
}

function adminLayout(active, content) {
  return `<div class="admin-shell">${adminNav(active)}<div class="admin-main"><header class="admin-topbar"><button class="icon-button" type="button" aria-label="알림" data-toast="새 알림이 없습니다">♢</button><a class="btn btn-secondary btn-sm" href="#home">고객 화면 보기 ↗</a></header><div class="admin-content">${content}</div></div></div>`;
}

function adminLoginPage() {
  return `<section class="admin-login"><form class="admin-login-card" data-demo-form><a class="logo" href="#home">Pop<span class="logo-mark">spot</span> <small style="font-size:12px;color:var(--muted)">ADMIN</small></a><h1 style="font-size:30px">관리자 로그인</h1><p class="muted">승인된 운영 계정으로만 접근할 수 있습니다.</p><div class="field" style="margin-top:24px"><label for="admin-email">이메일</label><input class="input" id="admin-email" type="email" value="admin@popspot.kr" required /></div><div class="field" style="margin-top:14px"><label for="admin-password">비밀번호</label><input class="input" id="admin-password" type="password" placeholder="비밀번호 입력" required /></div><button class="btn btn-primary btn-block" style="margin-top:22px" type="submit" data-route="admin-dashboard">관리자 로그인</button><div class="notice notice-warning" style="margin-top:18px"><span>!</span><span>공용 기기에서는 로그인 상태를 유지하지 마세요.</span></div></form></section>`;
}

function adminDashboardPage() {
  return adminLayout(
    "admin-dashboard",
    `<div class="admin-page-head"><div><p class="eyebrow">2026년 10월 10일 토요일</p><h1>안녕하세요, 운영 관리자님</h1><p>오늘의 팝업 운영 현황을 확인하세요.</p></div><a class="btn btn-primary" href="#admin-popup-form">＋ 새 팝업</a></div><section class="kpi-grid"><div class="kpi-card"><span class="kpi-label">오늘 예약</span><div class="kpi-value tabular">128</div><span class="kpi-delta">↑ 어제보다 12%</span></div><div class="kpi-card"><span class="kpi-label">오늘 방문</span><div class="kpi-value tabular">84</div><span class="small muted">체크인율 65.6%</span></div><div class="kpi-card"><span class="kpi-label">운영 회차</span><div class="kpi-value tabular">18</div><span class="small muted">매진 4회차</span></div><div class="kpi-card"><span class="kpi-label">취소</span><div class="kpi-value tabular">7</div><span class="small muted">취소율 5.2%</span></div></section><div class="dashboard-grid"><section class="admin-card"><div class="admin-card-head"><h2>오늘 회차 현황</h2><a class="text-link small" href="#admin-slots">전체 보기</a></div><div class="admin-card-body"><div class="progress-row"><strong>11:00</strong><div class="progress"><span style="width:100%"></span></div><span class="small tabular">20/20</span></div><div class="progress-row"><strong>13:00</strong><div class="progress"><span style="width:85%"></span></div><span class="small tabular">17/20</span></div><div class="progress-row"><strong>15:00</strong><div class="progress"><span style="width:70%"></span></div><span class="small tabular">14/20</span></div><div class="progress-row"><strong>17:00</strong><div class="progress"><span style="width:40%"></span></div><span class="small tabular">8/20</span></div></div></section><section class="admin-card"><div class="admin-card-head"><h2>운영 알림</h2></div><div class="admin-card-body"><ul class="activity-list"><li><span class="badge badge-warning">마감 임박</span><p class="small" style="margin:6px 0 0">15:00 회차 잔여 6석</p></li><li><span class="badge badge-danger">확인 필요</span><p class="small" style="margin:6px 0 0">중복 취소 요청 1건</p></li><li><span class="badge badge-blue">예약 오픈 예정</span><p class="small" style="margin:6px 0 0">Loop Lab · 10월 20일 14:00 KST</p></li></ul></div></section></div>`,
  );
}

function adminPopupsPage() {
  const rows = [
    [
      "도심 속 작은 정원",
      "성수 · 10.18—11.03",
      "예약 가능",
      "badge-success",
      "18",
      "312",
      "",
    ],
    [
      "나이트 아카이브 서울",
      "한남 · 10.24—11.10",
      "예약 가능",
      "badge-success",
      "24",
      "184",
      "",
    ],
    [
      "루프 랩 체험 전시",
      "성수 · 11.01—11.17",
      "오픈 대기",
      "badge-warning",
      "12",
      "0",
      "10.20 14:00 KST 자동 오픈",
    ],
    [
      "오브젝트 101",
      "서촌 · 10.20—11.08",
      "초안",
      "badge-neutral",
      "0",
      "0",
      "",
    ],
  ];
  return adminLayout(
    "admin-popups",
    `<div class="admin-page-head"><div><h1>팝업 관리</h1><p>팝업 게시 상태와 예약 오픈 일정을 관리합니다.</p></div><a class="btn btn-primary" href="#admin-popup-form">＋ 새 팝업</a></div><div class="toolbar"><input class="input" type="search" placeholder="팝업 이름 검색" aria-label="팝업 이름 검색" /><select class="select" aria-label="예약 상태"><option>전체 상태</option><option>예약 가능</option><option>오픈 대기</option><option>초안</option></select><button class="btn btn-secondary btn-sm" type="button" data-toast="필터를 적용했습니다">필터 적용</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>팝업</th><th>예약 상태</th><th>회차</th><th>예약</th><th>최근 수정</th><th><span class="skip-link">작업</span></th></tr></thead><tbody>${rows.map((row) => `<tr><td data-label="팝업"><div class="cell-title">${row[0]}</div><div class="cell-sub">${row[1]}</div></td><td data-label="예약 상태"><span class="badge ${row[3]}">${row[2]}</span>${row[6] ? `<div class="cell-sub" style="margin-top:5px">${row[6]}</div>` : ""}</td><td data-label="회차" class="tabular">${row[4]}개</td><td data-label="예약" class="tabular">${row[5]}건</td><td data-label="최근 수정"><span class="small">10.10 14:20</span></td><td data-label="작업"><div class="row-actions"><a class="btn btn-secondary btn-sm" href="#admin-popup-form">수정</a><a class="btn btn-ghost btn-sm" href="#admin-slots">회차</a></div></td></tr>`).join("")}</tbody></table></div>`,
  );
}

function adminPopupFormPage() {
  return adminLayout(
    "admin-popups",
    `<div class="admin-page-head"><div><div class="breadcrumbs"><span>팝업 관리</span><span>루프 랩 체험 전시</span></div><h1>팝업 수정</h1><p>고객 화면에 노출될 정보와 운영 정책을 설정합니다.</p></div><div class="hero-actions"><button class="btn btn-secondary" type="button" data-toast="미리보기 창을 엽니다">미리보기 ↗</button><button class="btn btn-primary" type="button" data-toast="변경사항을 저장했습니다">변경 저장</button></div></div><div class="editor-layout"><form data-demo-form><section class="editor-section"><h2>기본 정보</h2><div class="field"><label for="popup-name">팝업 이름</label><input class="input" id="popup-name" value="루프 랩 체험 전시" /></div><div class="form-grid" style="margin-top:16px"><div class="field"><label for="popup-category">카테고리</label><select class="select" id="popup-category"><option>테크</option></select></div><div class="field"><label for="popup-area">지역</label><select class="select" id="popup-area"><option>성수</option></select></div></div><div class="field" style="margin-top:16px"><label for="popup-copy">한 줄 소개</label><input class="input" id="popup-copy" value="움직임과 소리가 연결되는 인터랙티브 미디어 전시" /></div></section><section class="editor-section"><h2>대표 이미지</h2><button class="upload-box" type="button" data-toast="이미지 선택기를 엽니다"><span><strong>이미지를 끌어놓거나 선택하세요</strong><br><span class="small">권장 1600×1200 · JPG, PNG · 최대 5MB</span></span></button></section><section class="editor-section"><h2>기간과 장소</h2><div class="form-grid"><div class="field"><label for="start-date">시작일</label><input class="input" id="start-date" type="date" value="2026-11-01" /></div><div class="field"><label for="end-date">종료일</label><input class="input" id="end-date" type="date" value="2026-11-17" /></div></div><div class="field" style="margin-top:16px"><label for="address">주소</label><input class="input" id="address" value="서울 성동구 성수이로18길 7" /></div></section><section class="editor-section"><h2>상세 안내</h2><div class="field"><label for="description">공간 소개</label><textarea class="textarea" id="description">움직임과 소리가 실시간으로 연결되는 인터랙티브 미디어 전시입니다.</textarea></div><div class="field" style="margin-top:16px"><label for="policy">취소 정책</label><textarea class="textarea" id="policy">방문 24시간 전까지 무료 취소할 수 있습니다.</textarea></div></section><section class="editor-section"><h2>예약 오픈 설정</h2><p class="muted small">게시 상태와 별개로 고객의 예약 시작 시점을 설정합니다.</p><div class="chip-row" role="radiogroup" aria-label="예약 오픈 방식"><label class="chip"><input type="radio" name="open-mode" value="now" data-open-mode /> 즉시 오픈</label><label class="chip chip-active"><input type="radio" name="open-mode" value="scheduled" data-open-mode checked /> 날짜·시간 지정</label></div><div class="field" id="scheduled-open-field" style="margin-top:16px"><label for="scheduled-open">예약 오픈 일시 · 한국 시간(KST)</label><input class="input" id="scheduled-open" type="datetime-local" value="2026-10-20T14:00" /><span class="small muted">서버에는 UTC로 저장하고 고객 화면에는 KST로 표시합니다.</span></div><div class="scheduled-box" style="margin-top:16px"><strong>오픈 대기 → 예약 가능</strong><span>지정한 KST 시각에 서버 기준으로 자동 전환됩니다.</span></div></section></form><aside class="editor-side"><section class="admin-card"><div class="admin-card-head"><h3>게시 설정</h3></div><div class="admin-card-body"><div class="field"><label for="publish-status">상태</label><select class="select" id="publish-status"><option>게시 중</option><option>초안</option><option>게시 종료</option></select></div><div class="notice notice-warning" id="scheduled-open-notice" style="margin:16px 0"><span>◷</span><span><strong>예약 오픈 대기</strong><br>지정한 KST 시각에 자동 오픈</span></div><div class="notice notice-info" style="margin:16px 0"><span>ⓘ</span><span>회차 12개가 연결되어 있습니다.</span></div><a class="btn btn-secondary btn-block" href="#admin-slots">회차·정원 관리</a></div></section></aside></div>`,
  );
}

function adminSlotsPage() {
  const rows = [
    ["11:00", "20", "20", "0", "매진", "badge-neutral"],
    ["13:00", "20", "17", "3", "마감 임박", "badge-warning"],
    ["15:00", "20", "14", "6", "예약 가능", "badge-success"],
    ["17:00", "20", "8", "12", "예약 가능", "badge-success"],
  ];
  return adminLayout(
    "admin-slots",
    `<div class="admin-page-head"><div><div class="breadcrumbs"><span>팝업 관리</span><span>도심 속 작은 정원</span></div><h1>회차·정원 관리</h1><p>날짜별 방문 시간과 예약 가능 인원을 관리합니다.</p></div><div class="hero-actions"><button class="btn btn-secondary" type="button" data-toast="여러 날짜에 회차를 생성합니다">일괄 생성</button><button class="btn btn-primary" type="button" data-toast="새 회차 입력 행을 추가했습니다">＋ 회차 추가</button></div></div><div class="slot-summary"><div class="slot-stat"><span class="small muted">선택 날짜</span><strong>10.18</strong><span class="small">일요일</span></div><div class="slot-stat"><span class="small muted">총 정원</span><strong>80</strong><span class="small">4개 회차</span></div><div class="slot-stat"><span class="small muted">예약 / 잔여</span><strong>59 / 21</strong><span class="small">예약률 73.8%</span></div></div><div class="toolbar"><input class="input" type="date" value="2026-10-18" aria-label="관리 날짜" /><button class="chip" type="button">이전 날</button><button class="chip chip-active" type="button">오늘</button><button class="chip" type="button">다음 날</button></div><div class="notice notice-warning" style="margin-bottom:16px"><span>!</span><span>예약 인원보다 정원을 작게 변경할 수 없습니다.</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>시간</th><th>정원</th><th>예약</th><th>잔여</th><th>상태</th><th>작업</th></tr></thead><tbody>${rows.map((row) => `<tr><td data-label="시간" class="cell-title tabular">${row[0]}</td><td data-label="정원" class="tabular">${row[1]}명</td><td data-label="예약" class="tabular">${row[2]}명</td><td data-label="잔여" class="tabular">${row[3]}석</td><td data-label="상태"><span class="badge ${row[5]}">${row[4]}</span></td><td data-label="작업"><div class="row-actions"><button class="btn btn-secondary btn-sm" type="button" data-toast="회차 수정 폼을 엽니다">수정</button><button class="btn btn-ghost btn-sm" type="button" data-toast="회차 마감 확인을 요청합니다">마감</button></div></td></tr>`).join("")}</tbody></table></div>`,
  );
}

function adminReservationsPage() {
  const rows = [
    [
      "PS-261018-0427",
      "김팝업",
      "010-12**-56**",
      "10.18 15:00",
      "2명",
      "예약 확정",
      "badge-success",
    ],
    [
      "PS-261018-0418",
      "이성수",
      "010-98**-11**",
      "10.18 15:00",
      "1명",
      "체크인",
      "badge-blue",
    ],
    [
      "PS-261018-0391",
      "박정원",
      "010-55**-73**",
      "10.18 13:00",
      "3명",
      "예약 확정",
      "badge-success",
    ],
    [
      "PS-261018-0344",
      "최하늘",
      "010-31**-20**",
      "10.18 11:00",
      "2명",
      "취소",
      "badge-neutral",
    ],
  ];
  return adminLayout(
    "admin-reservations",
    `<div class="admin-page-head"><div><h1>예약 관리</h1><p>예약 상태를 확인하고 현장 체크인을 처리합니다.</p></div></div><div class="toolbar"><input class="input" type="search" placeholder="예약번호 또는 고객 검색" aria-label="예약 검색" /><select class="select" aria-label="팝업"><option>도심 속 작은 정원</option><option>전체 팝업</option></select><input class="input" style="width:auto" type="date" value="2026-10-18" aria-label="방문 날짜" /><select class="select" aria-label="예약 상태"><option>전체 상태</option><option>예약 확정</option><option>체크인</option><option>취소</option></select></div><div class="result-summary"><strong>예약 128건</strong><span class="small muted">고객 정보는 운영에 필요한 범위로 마스킹됩니다.</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>예약번호</th><th>고객</th><th>방문 회차</th><th>인원</th><th>상태</th><th>작업</th></tr></thead><tbody>${rows.map((row) => `<tr><td data-label="예약번호" class="cell-title tabular">${row[0]}</td><td data-label="고객"><div class="cell-title">${row[1]}</div><div class="cell-sub">${row[2]}</div></td><td data-label="방문 회차" class="tabular">${row[3]}</td><td data-label="인원">${row[4]}</td><td data-label="상태"><span class="badge ${row[6]}">${row[5]}</span></td><td data-label="작업"><a class="btn btn-secondary btn-sm" href="#admin-reservation-detail">상세 보기</a></td></tr>`).join("")}</tbody></table></div>`,
  );
}

function adminReservationDetailPage() {
  return adminLayout(
    "admin-reservations",
    `<div class="admin-page-head"><div><div class="breadcrumbs"><span>예약 관리</span><span>PS-261018-0427</span></div><div style="display:flex;align-items:center;gap:12px"><h1 style="margin:0">예약 상세</h1><span class="badge badge-success">예약 확정</span></div></div><div class="hero-actions"><button class="btn btn-danger" type="button" data-toast="관리자 취소 확인 대화상자를 표시합니다">예약 취소</button><button class="btn btn-primary" type="button" data-toast="체크인 처리되었습니다">체크인 처리</button></div></div><div class="dashboard-grid"><div><section class="admin-card"><div class="admin-card-head"><h2>예약 정보</h2><span class="booking-code tabular" style="font-size:14px">PS-261018-0427</span></div><div class="admin-card-body"><dl style="margin:0"><div class="detail-pair"><dt>팝업</dt><dd>도심 속 작은 정원</dd></div><div class="detail-pair"><dt>방문 일시</dt><dd>2026년 10월 18일 일요일, 15:00 (KST)</dd></div><div class="detail-pair"><dt>예약 인원</dt><dd>2명</dd></div><div class="detail-pair"><dt>신청 일시</dt><dd>2026년 10월 10일 14:27 (KST)</dd></div></dl></div></section><section class="admin-card" style="margin-top:18px"><div class="admin-card-head"><h2>고객 정보</h2><span class="small muted">개인정보 보호 적용</span></div><div class="admin-card-body"><dl style="margin:0"><div class="detail-pair"><dt>예약자</dt><dd>김팝업</dd></div><div class="detail-pair"><dt>휴대폰</dt><dd>010-12**-56** <button class="btn btn-ghost btn-sm" type="button" data-toast="권한 확인 후 전체 번호를 표시합니다">보기</button></dd></div><div class="detail-pair"><dt>이메일</dt><dd>p***p@example.com</dd></div></dl></div></section></div><aside class="admin-card"><div class="admin-card-head"><h2>상태 이력</h2></div><div class="admin-card-body"><ol class="timeline"><li><strong>예약 확정</strong><div class="small muted">10.10 14:27 · 고객</div></li><li><strong>확인 이메일 발송</strong><div class="small muted">10.10 14:28 · 시스템</div></li><li><strong>방문 예정</strong><div class="small muted">10.18 15:00</div></li></ol><div class="notice notice-info"><span>ⓘ</span><span>체크인 처리는 방문 당일에만 가능합니다.</span></div></div></aside></div>`,
  );
}

function adminDebugPage() {
  return adminLayout(
    "admin-debug",
    `<div class="admin-page-head"><div><p class="eyebrow">Operations lab</p><h1>운영 테스트</h1><p>격리된 합성 데이터로 라이브 상황을 안전하게 재현합니다.</p></div><span class="badge badge-neutral">운영도구 권한 필요</span></div><div class="environment-banner"><div><strong>테스트 전용 환경에 연결됨</strong><span class="small">실제 고객·운영 DB에는 요청을 보낼 수 없습니다. 서버도 production 대상을 거부합니다.</span></div><span class="environment-chip">SANDBOX</span></div><div class="debug-layout"><section class="admin-card"><div class="admin-card-head"><h2>테스트 시나리오</h2><span class="small muted">동시에 1개만 실행</span></div><div class="admin-card-body"><div class="scenario-grid" role="group" aria-label="테스트 시나리오"><button class="scenario-card scenario-card-active" type="button" aria-pressed="true" data-debug-scenario><strong>↗ 부하</strong><span>트래픽 급증과 응답 시간</span></button><button class="scenario-card" type="button" aria-pressed="false" data-debug-scenario><strong>⇄ 동시 예약</strong><span>정원·중복 예약 불변식</span></button><button class="scenario-card" type="button" aria-pressed="false" data-debug-scenario><strong>◷ 지연</strong><span>API 지연과 타임아웃</span></button><button class="scenario-card" type="button" aria-pressed="false" data-debug-scenario><strong>! 장애</strong><span>통제된 5xx 오류 주입</span></button></div><div class="form-grid" style="margin-top:20px"><div class="field"><label for="test-target">허용된 테스트 대상</label><select class="select" id="test-target"><option>TEST · Tiny Garden 15:00</option><option>TEST · Loop Lab 오픈 경계</option></select></div><div class="field"><label for="virtual-users">가상 사용자 · 최대 100</label><input class="input" id="virtual-users" type="number" min="1" max="100" value="50" /></div><div class="field"><label for="test-duration">지속 시간 · 최대 60초</label><input class="input" id="test-duration" type="number" min="5" max="60" value="30" /></div><div class="field"><label for="ramp-up">Ramp-up</label><select class="select" id="ramp-up"><option>10초 동안 점진 증가</option><option>즉시 최대 부하</option></select></div></div><div class="notice notice-info" style="margin-top:18px"><span>ⓘ</span><span>합성 계정과 격리된 테스트 회차만 사용하며 모든 실행은 감사 로그에 기록됩니다.</span></div></div></section><aside class="admin-card"><div class="admin-card-head"><h2>실행 전 확인</h2></div><div class="admin-card-body"><ul class="debug-limits"><li><span>최대 요청률</span><strong>100 RPS</strong></li><li><span>자동 종료</span><strong>60초</strong></li><li><span>테스트 데이터 TTL</span><strong>10분</strong></li><li><span>핵심 불변식</span><strong>초과 예약 0</strong></li></ul><label class="check-row small" style="margin-top:18px"><input id="safety-check" type="checkbox" /> 운영 데이터와 분리된 테스트임을 확인했습니다.</label><div class="field" style="margin-top:14px"><label for="confirm-word">확인을 위해 TEST 입력</label><input class="input" id="confirm-word" autocomplete="off" placeholder="TEST" /></div><button class="btn btn-primary btn-block" id="debug-run" type="button" data-debug-run disabled style="margin-top:16px">테스트 실행</button><p class="small muted" style="margin:10px 0 0">권한·대상·상한은 서버에서 다시 검증합니다.</p></div></aside></div><section class="admin-card debug-run-card" id="debug-live" hidden><div class="admin-card-head"><div><span class="status-pulse" id="debug-status">테스트 실행 중</span><span class="small" style="margin-left:10px">부하 · TEST Tiny Garden</span></div><button class="btn btn-danger btn-sm" type="button" data-debug-stop>즉시 중지</button></div><div class="admin-card-body"><div class="metric-grid"><div class="metric-card"><span>누적 요청</span><strong id="metric-requests">1,248</strong></div><div class="metric-card"><span>성공률</span><strong class="metric-ok">99.92%</strong></div><div class="metric-card"><span>p95 응답</span><strong>284ms</strong></div><div class="metric-card"><span>정원 초과</span><strong class="metric-ok">0건</strong></div></div><h3 style="margin-top:20px">최근 이벤트 · 민감정보 마스킹</h3><div class="debug-log">14:31:02&nbsp; ramp-up&nbsp; 25 users&nbsp; p95=196ms<br>14:31:08&nbsp; reserve&nbsp; request=synthetic-***&nbsp; 201<br>14:31:12&nbsp; invariant capacity_ok&nbsp; reserved=20/20<br>14:31:16&nbsp; retry&nbsp; idempotency_key=test-***&nbsp; deduplicated</div></div></section><section class="admin-card" style="margin-top:18px"><div class="admin-card-head"><h2>최근 실행</h2><span class="small muted">감사 로그 보관 30일</span></div><div class="table-wrap" style="border:0;border-radius:0"><table class="data-table"><thead><tr><th>실행 시각</th><th>시나리오</th><th>실행자</th><th>결과</th></tr></thead><tbody><tr><td data-label="실행 시각">10.10 13:20 KST</td><td data-label="시나리오">동시 예약 · 50 users</td><td data-label="실행자">ops-a***@popspot.kr</td><td data-label="결과"><span class="badge badge-success">통과 · 초과 0</span></td></tr></tbody></table></div></section>`,
  );
}

const renderers = {
  home: homePage,
  popups: popupsPage,
  "popup-detail": popupDetailPage,
  "popup-waiting": popupWaitingPage,
  auth: authPage,
  reserve: reservePage,
  "reserve-complete": reserveCompletePage,
  "my-reservations": myReservationsPage,
  "reservation-detail": reservationDetailPage,
  "admin-login": adminLoginPage,
  "admin-dashboard": adminDashboardPage,
  "admin-popups": adminPopupsPage,
  "admin-popup-form": adminPopupFormPage,
  "admin-slots": adminSlotsPage,
  "admin-reservations": adminReservationsPage,
  "admin-reservation-detail": adminReservationDetailPage,
  "admin-debug": adminDebugPage,
};

const app = document.querySelector("#app");
const screenSelect = document.querySelector("#screen-select");
const toast = document.querySelector("#toast");
let toastTimer;

function currentScreen() {
  const route = location.hash.replace(/^#/, "");
  return screens.includes(route) ? route : "home";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("toast-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("toast-show"), 2200);
}

function updateDebugRunState() {
  const runButton = document.querySelector("#debug-run");
  if (!runButton) return;
  document.querySelector("#virtual-users").required = true;
  document.querySelector("#test-duration").required = true;
  const running = Boolean(
    document.querySelector("#debug-live")?.dataset.running,
  );
  const checked = document.querySelector("#safety-check").checked;
  const confirmed =
    document.querySelector("#confirm-word").value.trim() === "TEST";
  const usersValid = document.querySelector("#virtual-users").checkValidity();
  const durationValid = document
    .querySelector("#test-duration")
    .checkValidity();
  runButton.disabled =
    running || !(checked && confirmed && usersValid && durationValid);
}

function render() {
  const screen = currentScreen();
  app.innerHTML = renderers[screen]();
  app.className = screen.startsWith("admin") ? "admin-view" : "customer-view";
  if (screen === "admin-dashboard") {
    const scheduledBadge = [
      ...app.querySelectorAll(".activity-list .badge"),
    ].find((badge) => badge.textContent.includes("예약 오픈 예정"));
    if (scheduledBadge) {
      scheduledBadge.textContent = "오픈 대기";
      scheduledBadge.className = "badge badge-warning";
    }
  }
  screenSelect.value = screen;
  document.title = `${screenSelect.options[screenSelect.selectedIndex].text} · Popspot Design`;
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}

screenSelect.addEventListener("change", () => {
  location.hash = screenSelect.value;
});
window.addEventListener("hashchange", render);

document.addEventListener("click", (event) => {
  const skipLink = event.target.closest("a.skip-link");
  if (skipLink) {
    event.preventDefault();
    const mainContent =
      app.querySelector(".admin-content, .auth-form-wrap, .site-header + *") ||
      app;
    mainContent.tabIndex = -1;
    mainContent.focus();
    return;
  }

  const toastTarget = event.target.closest("[data-toast]");
  if (toastTarget) showToast(toastTarget.dataset.toast);

  const choice = event.target.closest(".choice:not(:disabled)");
  if (choice) {
    const group = choice.closest(".date-row, .slot-grid");
    group.querySelectorAll(".choice").forEach((button) => {
      button.classList.toggle("choice-active", button === choice);
      button.setAttribute("aria-pressed", String(button === choice));
    });
    if (group.classList.contains("slot-grid")) {
      const selectedTime = choice.querySelector("strong").textContent;
      document.querySelector("#reserve-cta").textContent =
        `${selectedTime} 예약하기`;
    } else if (choice.dataset.date) {
      group.parentElement.querySelector(".field-label").textContent =
        `${choice.dataset.date} · KST`;
    }
  }

  const bookingTab = event.target.closest("[data-booking-tab]");
  if (bookingTab) {
    bookingTab.parentElement
      .querySelectorAll("[data-booking-tab]")
      .forEach((button) => {
        button.classList.toggle("tab-active", button === bookingTab);
        button.setAttribute("aria-pressed", String(button === bookingTab));
      });
    showToast(`${bookingTab.textContent.trim()} 예약을 선택했습니다`);
  }

  const debugScenario = event.target.closest("[data-debug-scenario]");
  if (debugScenario) {
    debugScenario.parentElement
      .querySelectorAll("[data-debug-scenario]")
      .forEach((button) => {
        button.classList.toggle(
          "scenario-card-active",
          button === debugScenario,
        );
        button.setAttribute("aria-pressed", String(button === debugScenario));
      });
    if (debugScenario.textContent.includes("장애"))
      showToast(
        "실제 운영에서는 장애 테스트 전에 관리자 재인증이 추가로 필요합니다",
      );
  }

  const debugRun = event.target.closest("[data-debug-run]");
  if (debugRun) {
    const live = document.querySelector("#debug-live");
    const status = document.querySelector("#debug-status");
    const stopButton = document.querySelector("[data-debug-stop]");
    const scenario = document
      .querySelector('[data-debug-scenario][aria-pressed="true"] strong')
      .textContent.replace(/^\S+\s/, "")
      .trim();
    const target =
      document.querySelector("#test-target").selectedOptions[0].textContent;
    live.hidden = false;
    live.dataset.running = "1";
    status.textContent = "테스트 실행 중";
    status.className = "status-pulse";
    status.tabIndex = -1;
    status.nextElementSibling.textContent = `${scenario} · ${target}`;
    stopButton.disabled = false;
    debugRun.textContent = "실행 중";
    updateDebugRunState();
    live.scrollIntoView({ block: "start" });
    stopButton.focus();
    showToast("샌드박스 시뮬레이션을 시작했습니다");
  }

  const debugStop = event.target.closest("[data-debug-stop]");
  if (debugStop) {
    const live = document.querySelector("#debug-live");
    const status = document.querySelector("#debug-status");
    const runButton = document.querySelector("#debug-run");
    delete live.dataset.running;
    status.textContent = "테스트 중지됨";
    status.classList.add("status-stopped");
    debugStop.disabled = true;
    runButton.textContent = "테스트 실행";
    updateDebugRunState();
    status.focus();
    showToast("테스트를 중지하고 합성 데이터 정리를 시작했습니다");
  }

  const authToggle = event.target.closest("[data-auth-toggle]");
  if (authToggle) {
    const form = authToggle.closest("form");
    const signup = form.dataset.mode !== "signup";
    form.dataset.mode = signup ? "signup" : "login";
    form.querySelector("#auth-eyebrow").textContent = signup
      ? "Join Popspot"
      : "Welcome back";
    form.querySelector("#auth-title").textContent = signup
      ? "회원가입"
      : "로그인";
    form.querySelector("#auth-switch-lead").textContent = signup
      ? "이미 계정이 있나요?"
      : "처음이신가요?";
    authToggle.textContent = signup ? "로그인하기" : "30초 만에 가입하기";
    const nameField = form.querySelector("#signup-name-field");
    const nameInput = form.querySelector("#signup-name");
    nameField.hidden = !signup;
    nameInput.required = signup;
    form.querySelector("#login-options").hidden = signup;
    form.querySelector("#auth-submit").textContent = signup
      ? "가입하고 예약 계속"
      : "로그인하고 예약 계속";
  }

  const cancelOpen = event.target.closest("[data-cancel-open]");
  if (cancelOpen) document.querySelector("#cancel-dialog").showModal();

  const dialogClose = event.target.closest("[data-dialog-close]");
  if (dialogClose) dialogClose.closest("dialog").close();

  const cancelConfirm = event.target.closest("[data-cancel-confirm]");
  if (cancelConfirm) {
    const dialog = cancelConfirm.closest("dialog");
    const status = document.querySelector("#booking-status");
    const cancelButton = document.querySelector("#cancel-booking");
    status.textContent = "취소됨";
    status.className = "badge badge-neutral";
    cancelButton.textContent = "취소 완료";
    cancelButton.disabled = true;
    dialog.close();
    status.focus();
    showToast("예약이 취소되었습니다");
  }

  const countButton = event.target.closest("[data-count]");
  if (countButton) {
    const count = document.querySelector("#guest-count");
    const summary = document.querySelector("#summary-count");
    const next = Math.max(
      1,
      Math.min(
        4,
        Number(count.textContent) +
          (countButton.dataset.count === "plus" ? 1 : -1),
      ),
    );
    count.textContent = next;
    summary.textContent = `${next}명`;
  }
});

document.addEventListener("change", (event) => {
  const openMode = event.target.closest("[data-open-mode]");
  if (!openMode) return;
  const section = openMode.closest(".editor-section");
  const scheduled = openMode.value === "scheduled";
  section.querySelector("#scheduled-open-field").hidden = !scheduled;
  section.querySelector(".scheduled-box").hidden = !scheduled;
  document.querySelector("#scheduled-open-notice").hidden = !scheduled;
  section
    .querySelectorAll("[data-open-mode]")
    .forEach((input) =>
      input.closest("label").classList.toggle("chip-active", input.checked),
    );
});

document.addEventListener("input", (event) => {
  if (
    !event.target.matches(
      "#safety-check, #confirm-word, #virtual-users, #test-duration",
    )
  )
    return;
  updateDebugRunState();
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-demo-form]");
  if (!form) return;
  event.preventDefault();
  const routeButton = event.submitter?.dataset.route;
  if (routeButton) location.hash = routeButton;
  else showToast("프로토타입에서 입력 내용을 확인했습니다");
});

render();
