-- Local demo data only (enabled via FLYWAY_LOCATIONS in docker-compose). Times are relative to when the seed runs.
insert into popups (title, label, area, category, summary, description, notice, address, operating_hours, visit_minutes,
                    art_theme, starts_on, ends_on, publish_status, opens_at)
values
    ('도심 속 작은 정원', 'Tiny Garden', '성수', '라이프스타일',
     '바쁜 도시 한가운데서 식물과 향, 차를 천천히 경험하는 40분의 휴식입니다.',
     '세 가지 테마의 작은 정원을 거닐며 계절의 향과 차를 만납니다. 예약자에게는 현장에서 식물 카드와 시음 차가 제공됩니다.',
     '사진 촬영은 가능하지만 플래시와 삼각대 사용은 어렵습니다.',
     '서울 성동구 연무장길 42, 1층', '매일 11:00 — 20:00', 40, 'red',
     current_date - 3, current_date + 21, 'PUBLISHED', now() - interval '3 days'),
    ('나이트 아카이브 서울', 'Night Archive', '한남', '패션',
     '밤의 도시를 기록한 아카이브 의류와 사진을 만나는 야간 전시입니다.',
     '시즌 아카이브와 한정 협업 제품을 함께 소개합니다.', null,
     '서울 용산구 한남대로 27길 8', '매일 14:00 — 22:00', 50, 'blue',
     current_date - 1, current_date + 30, 'PUBLISHED', now() - interval '1 day'),
    ('슬로우 테이블 마켓', 'Slow Table', '연남', '푸드',
     '작은 농가와 셰프가 함께 차린 느린 식탁을 맛보는 마켓입니다.',
     '시식 코스와 제철 식재료 장터가 함께 운영됩니다.', '알레르기가 있다면 현장 직원에게 미리 알려 주세요.',
     '서울 마포구 성미산로 190', '매일 11:00 — 19:00', 30, 'green',
     current_date, current_date + 14, 'PUBLISHED', now() - interval '2 hours'),
    ('루프 랩 체험 전시', 'Loop Lab', '성수', '테크',
     '움직임과 소리가 실시간으로 연결되는 인터랙티브 미디어 전시입니다.',
     '센서가 관람객의 움직임을 읽어 공간 전체의 소리와 빛을 바꿉니다.', null,
     '서울 성동구 성수이로18길 7', '매일 12:00 — 21:00', 60, 'orange',
     current_date + 20, current_date + 36, 'PUBLISHED', date_trunc('hour', now()) + interval '10 days'),
    ('오브젝트 101', 'Object 101', '서촌', '디자인',
     '일상 사물 101개를 다시 바라보는 디자인 전시입니다.', '준비 중인 팝업입니다.', null,
     '서울 종로구 자하문로 7길 12', '매일 11:00 — 19:00', 40, 'yellow',
     current_date + 10, current_date + 30, 'DRAFT', now() + interval '5 days');

-- Daily KST sessions for the next 7 days (14 days for the waiting popup, starting on its first day).
insert into slots (popup_id, starts_at, ends_at, capacity)
select p.id,
       ((now() at time zone 'Asia/Seoul')::date + d + t) at time zone 'Asia/Seoul',
       ((now() at time zone 'Asia/Seoul')::date + d + t + make_interval(mins => p.visit_minutes)) at time zone 'Asia/Seoul',
       20
from popups p
cross join generate_series(0, 6) as d
cross join (values (time '11:00'), (time '13:00'), (time '15:00'), (time '17:00')) as v(t)
where p.label in ('Tiny Garden', 'Night Archive', 'Slow Table');

insert into slots (popup_id, starts_at, ends_at, capacity)
select p.id,
       (p.starts_on + d + t) at time zone 'Asia/Seoul',
       (p.starts_on + d + t + make_interval(mins => p.visit_minutes)) at time zone 'Asia/Seoul',
       12
from popups p
cross join generate_series(0, 13) as d
cross join (values (time '12:00'), (time '15:00'), (time '18:00')) as v(t)
where p.label = 'Loop Lab';
