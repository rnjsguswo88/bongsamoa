-- 봉사모아 · 테이블 10개
-- docs/02_데이터설계.md 2장 기준
-- Supabase 대시보드 → SQL Editor 에서 전체를 붙여넣고 Run

create extension if not exists pgcrypto;
create extension if not exists pg_trgm; -- 나중에 중복 센터 이름 유사도 검사용

-- ─────────────────────────────────────────────
-- 1. profiles — 사용자 (auth.users 에 딸린 추가 정보)
-- ─────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  nickname text not null unique,
  avatar_url text,
  is_admin boolean not null default false,
  attended_count integer not null default 0,
  unconfirmed_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint chk_nickname_length check (char_length(trim(nickname)) >= 2)
);

-- ─────────────────────────────────────────────
-- 2. centers — 봉사센터
-- ─────────────────────────────────────────────
create table centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('animal','environment','child','senior','disability','etc')),
  description text,
  guide text,
  region_sido text,
  region_sigungu text,
  address text,
  contact_phone text not null,
  image_url text,
  cond_age text not null default 'any' check (cond_age in ('any','age14','age19','guardian')),
  cond_tags text[] not null default '{}',
  cond_bring text,
  cond_parking boolean not null default false,
  has_insurance boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  reject_reason text,
  approved_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 3. center_members — 센터 담당자
-- ─────────────────────────────────────────────
create table center_members (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references centers(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner','staff')),
  created_at timestamptz not null default now(),
  unique (center_id, profile_id)
);

-- ─────────────────────────────────────────────
-- 4. center_join_requests — 관리자 등록 요청
-- ─────────────────────────────────────────────
create table center_join_requests (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references centers(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  handled_by uuid references profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

-- pending 상태는 같은 사람이 같은 센터에 중복 요청 못 함
create unique index uq_join_request_pending
  on center_join_requests (center_id, requester_id)
  where (status = 'pending');

-- ─────────────────────────────────────────────
-- 5. schedules — 반복 일정
-- ─────────────────────────────────────────────
create table schedules (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references centers(id) on delete cascade,
  title text not null,
  repeat_start_date date not null,
  repeat_end_date date not null,
  repeat_weekdays integer[] not null,
  start_time time not null,
  end_time time not null,
  capacity integer not null check (capacity > 0),
  location_text text,
  open_days_before integer not null default 14,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint chk_repeat_range check (
    repeat_end_date >= repeat_start_date
    and repeat_end_date <= repeat_start_date + interval '1 year'
  ),
  constraint chk_weekdays_not_empty check (array_length(repeat_weekdays, 1) > 0),
  constraint chk_time_order check (end_time > start_time)
);

-- ─────────────────────────────────────────────
-- 6. sessions — 회차 (가장 중요)
-- ─────────────────────────────────────────────
create table sessions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  center_id uuid not null references centers(id) on delete cascade,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  capacity integer not null check (capacity > 0),
  location_text text,
  open_days_before integer not null default 14,
  confirmed_count integer not null default 0,
  status text not null default 'open' check (status in ('open','closed','cancelled','done')),
  cancel_reason text,
  created_at timestamptz not null default now(),
  unique (schedule_id, session_date)
);

create index idx_sessions_center_date on sessions (center_id, session_date);

-- ─────────────────────────────────────────────
-- 7. applications — 참여 신청
-- ─────────────────────────────────────────────
create table applications (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  volunteer_id uuid references profiles(id) on delete cascade,
  status text not null check (status in ('confirmed','cancelled','attended','unconfirmed')),
  cancelled_by text check (cancelled_by in ('volunteer','center')),
  cancelled_by_member_id uuid references profiles(id),
  attended_at timestamptz,
  agreed_at timestamptz,
  note text,
  manual_name text,
  manual_memo text,
  created_by uuid references profiles(id),
  applied_at timestamptz not null default now(),
  cancelled_at timestamptz,
  -- volunteer_id 가 null(직접 추가)이면 중복 검사에서 자동으로 빠짐 (Postgres 기본 동작)
  unique (session_id, volunteer_id)
);

create index idx_applications_volunteer on applications (volunteer_id);
create index idx_applications_session on applications (session_id);

-- ─────────────────────────────────────────────
-- 8. reviews — 봉사 후기
-- ─────────────────────────────────────────────
create table reviews (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references centers(id) on delete cascade,
  application_id uuid not null unique references applications(id) on delete cascade,
  volunteer_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  content text not null,
  images text[] not null default '{}',
  status text not null default 'visible' check (status in ('visible','hidden')),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chk_images_max check (array_length(images, 1) is null or array_length(images, 1) <= 5)
);

create index idx_reviews_center on reviews (center_id);

-- ─────────────────────────────────────────────
-- 9. review_reports — 후기 신고
-- ─────────────────────────────────────────────
create table review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  result text not null default 'pending' check (result in ('pending','kept','hidden')),
  handled_by uuid references profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 10. favorites — 찜한 센터
-- ─────────────────────────────────────────────
create table favorites (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references centers(id) on delete cascade,
  volunteer_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (center_id, volunteer_id)
);
