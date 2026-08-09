-- 봉사모아 · RLS(행 수준 보안) 켜기 + 정책
-- docs/02_데이터설계.md 4장 기준
-- 001, 002 실행 후에 이걸 실행하세요.

-- ─────────────────────────────────────────────
-- 도우미 함수 (정책 안에서 반복 사용)
-- security definer 라서 이 함수 안에서는 RLS를 안 타고 직접 조회합니다.
-- 그래서 center_members 정책이 자기 자신을 다시 참조해도 무한 루프가 안 생깁니다.
-- ─────────────────────────────────────────────
create or replace function public.is_center_member(p_center_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from center_members
    where center_id = p_center_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_center_owner(p_center_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from center_members
    where center_id = p_center_id and profile_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- ─────────────────────────────────────────────
-- 1. profiles
-- ─────────────────────────────────────────────
alter table profiles enable row level security;

create policy "본인 프로필 조회" on profiles
  for select using (id = auth.uid());

create policy "같은 센터 담당자끼리 조회" on profiles
  for select using (
    exists (
      select 1 from center_members cm1
      join center_members cm2 on cm1.center_id = cm2.center_id
      where cm1.profile_id = auth.uid() and cm2.profile_id = profiles.id
    )
  );

create policy "센터 담당자는 신청자 프로필 조회" on profiles
  for select using (
    exists (
      select 1 from applications a
      join sessions s on s.id = a.session_id
      where a.volunteer_id = profiles.id and is_center_member(s.center_id)
    )
  );

create policy "운영자는 전체 조회" on profiles
  for select using (is_admin());

create policy "본인 프로필 생성" on profiles
  for insert with check (id = auth.uid());

create policy "본인 프로필 수정" on profiles
  for update using (id = auth.uid());

-- ─────────────────────────────────────────────
-- 2. centers
-- ─────────────────────────────────────────────
alter table centers enable row level security;

create policy "승인된 센터는 누구나 조회" on centers
  for select using (status = 'approved');

create policy "신청자 본인은 자기 센터 조회" on centers
  for select using (created_by = auth.uid());

create policy "담당자는 자기 센터 조회" on centers
  for select using (is_center_member(id));

create policy "운영자는 전체 조회" on centers
  for select using (is_admin());

create policy "로그인 사용자는 센터 등록 신청 가능" on centers
  for insert to authenticated
  with check (created_by = auth.uid() and status = 'pending');

create policy "소유자·운영자는 센터 정보 수정" on centers
  for update using (is_center_owner(id) or is_admin());

-- ─────────────────────────────────────────────
-- 3. center_members
-- ─────────────────────────────────────────────
alter table center_members enable row level security;

create policy "같은 센터 소속이면 조회" on center_members
  for select using (is_center_member(center_id));

create policy "소유자·운영자는 담당자 추가" on center_members
  for insert with check (is_center_owner(center_id) or is_admin());

create policy "소유자·운영자는 역할 변경" on center_members
  for update using (is_center_owner(center_id) or is_admin());

create policy "소유자 또는 본인은 담당자 제외·탈퇴" on center_members
  for delete using (is_center_owner(center_id) or profile_id = auth.uid() or is_admin());

-- ─────────────────────────────────────────────
-- 4. center_join_requests
-- ─────────────────────────────────────────────
alter table center_join_requests enable row level security;

create policy "요청자 본인과 소유자만 조회" on center_join_requests
  for select using (requester_id = auth.uid() or is_center_owner(center_id) or is_admin());

create policy "로그인 사용자는 요청 생성" on center_join_requests
  for insert to authenticated
  with check (requester_id = auth.uid());

create policy "요청자는 취소, 소유자는 승인·반려" on center_join_requests
  for update using (requester_id = auth.uid() or is_center_owner(center_id) or is_admin());

-- ─────────────────────────────────────────────
-- 5. schedules
-- ─────────────────────────────────────────────
alter table schedules enable row level security;

create policy "승인된 센터의 일정은 누구나 조회" on schedules
  for select using (
    exists (select 1 from centers c where c.id = center_id and c.status = 'approved')
    or is_center_member(center_id)
  );

create policy "담당자는 일정 생성·수정·삭제" on schedules
  for all using (is_center_member(center_id))
  with check (is_center_member(center_id));

-- ─────────────────────────────────────────────
-- 6. sessions
-- ─────────────────────────────────────────────
alter table sessions enable row level security;

create policy "승인된 센터의 회차는 누구나 조회" on sessions
  for select using (
    exists (select 1 from centers c where c.id = center_id and c.status = 'approved')
    or is_center_member(center_id)
  );

create policy "담당자는 회차 생성·수정·삭제" on sessions
  for all using (is_center_member(center_id))
  with check (is_center_member(center_id));

-- ─────────────────────────────────────────────
-- 7. applications
-- ─────────────────────────────────────────────
alter table applications enable row level security;

create policy "본인 신청과 소속 센터 신청 조회" on applications
  for select using (
    volunteer_id = auth.uid()
    or exists (select 1 from sessions s where s.id = session_id and is_center_member(s.center_id))
  );

create policy "본인 신청 또는 담당자 직접 추가" on applications
  for insert with check (
    volunteer_id = auth.uid()
    or exists (select 1 from sessions s where s.id = session_id and is_center_member(s.center_id))
  );

create policy "본인 또는 담당자는 신청 상태 변경" on applications
  for update using (
    volunteer_id = auth.uid()
    or exists (select 1 from sessions s where s.id = session_id and is_center_member(s.center_id))
  );

create policy "담당자는 직접 추가 신청 삭제" on applications
  for delete using (
    exists (select 1 from sessions s where s.id = session_id and is_center_member(s.center_id))
  );

-- ─────────────────────────────────────────────
-- 8. reviews
-- ─────────────────────────────────────────────
alter table reviews enable row level security;

create policy "공개 후기는 누구나 조회" on reviews
  for select using (status = 'visible' and deleted_at is null);

create policy "작성자 본인은 항상 조회" on reviews
  for select using (volunteer_id = auth.uid());

create policy "운영자는 전체 조회" on reviews
  for select using (is_admin());

create policy "참석 확인한 본인만 후기 작성" on reviews
  for insert with check (
    volunteer_id = auth.uid()
    and exists (
      select 1 from applications a
      where a.id = application_id and a.volunteer_id = auth.uid() and a.status = 'attended'
    )
  );

create policy "작성자 본인 또는 운영자는 수정" on reviews
  for update using (volunteer_id = auth.uid() or is_admin());

create policy "작성자 본인은 삭제" on reviews
  for delete using (volunteer_id = auth.uid());

-- ─────────────────────────────────────────────
-- 9. review_reports
-- ─────────────────────────────────────────────
alter table review_reports enable row level security;

create policy "신고자 본인과 운영자만 조회" on review_reports
  for select using (reporter_id = auth.uid() or is_admin());

create policy "로그인 사용자는 신고 생성" on review_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

create policy "운영자는 처리" on review_reports
  for update using (is_admin());

-- ─────────────────────────────────────────────
-- 10. favorites
-- ─────────────────────────────────────────────
alter table favorites enable row level security;

create policy "본인 찜만 조회·생성·삭제" on favorites
  for all using (volunteer_id = auth.uid())
  with check (volunteer_id = auth.uid());
