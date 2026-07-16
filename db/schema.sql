-- cafeteria_menus — 학식 식단 (b안: 별도 테이블, trd-requests ③ 추천 · M3 step-3)
-- 학식은 "식당"이 아니라 "날짜별 식단"이라 restaurants 의 hours/menu 구조와 안 맞음.
-- ⚠ 팀 Supabase 적용은 스키마 주인(팀원) 승인 후 — 이 파일은 준비본 (M3 결정 로그 참조).

create table if not exists cafeteria_menus (
  id bigint generated always as identity primary key,
  campus text not null default '인사',
  cafeteria text not null,                 -- 예: 패컬티, 금잔디, 법고을, 은행골 (크롤러가 h6 에서 파싱)
  corner text,                             -- 코너명 (없으면 null)
  menu_date date not null,
  meal text not null check (meal in ('B','L','D','S')),  -- 조식/중식/석식/간식
  items jsonb not null default '[]',       -- ["양송이스프", "함박스테이크", ...]
  price integer check (price is null or (price >= 500 and price <= 50000)),  -- 원, null = 미표기
  source_url text,
  crawled_at timestamptz not null default now(),
  unique (cafeteria, menu_date, meal, corner)
);

-- RLS: 읽기 공개(추천 풀 노출), 쓰기는 크롤러의 서비스 롤 경로만 (anon insert 금지 —
-- restaurants 의 "pending 만 익명 insert" 정책과 달리 학식은 사용자 제보 경로가 없다)
alter table cafeteria_menus enable row level security;

create policy "cafeteria_menus_public_read"
  on cafeteria_menus for select
  using (true);

-- upsert 경로 (크롤러 → 서비스 롤):
--   insert into cafeteria_menus (campus, cafeteria, corner, menu_date, meal, items, price, source_url)
--   values (...)
--   on conflict (cafeteria, menu_date, meal, corner) do update
--     set items = excluded.items, price = excluded.price, crawled_at = now();
