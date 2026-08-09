-- 봉사모아 · 신청 처리 함수
-- docs/02_데이터설계.md 3장 ①·①-2·⑦ 기준
-- 001, 002, 003 실행 후에 이걸 실행하세요.

-- ─────────────────────────────────────────────
-- 신청하기
--   1) 회차를 잠그고(FOR UPDATE) 상태·오픈일·정원을 확인
--   2) 같은 시간대에 이미 confirmed 된 신청이 있는지 확인
--   3) 통과하면 신청 생성(취소했던 회차면 되살림) + confirmed_count +1
-- 전부 하나의 트랜잭션이라 동시에 눌러도 정원을 못 넘습니다.
-- ─────────────────────────────────────────────
create or replace function public.apply_to_session(p_session_id uuid)
returns applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session sessions%rowtype;
  v_app applications%rowtype;
  v_open_date date;
  v_overlap record;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v_session from sessions where id = p_session_id for update;
  if not found then
    raise exception '존재하지 않는 회차입니다.';
  end if;

  if v_session.status <> 'open' then
    raise exception '신청할 수 없는 회차입니다.';
  end if;

  v_open_date := v_session.session_date - v_session.open_days_before;
  if current_date < v_open_date then
    raise exception '아직 신청 기간이 아닙니다. %부터 신청할 수 있습니다.', v_open_date;
  end if;

  if v_session.confirmed_count >= v_session.capacity then
    raise exception '이미 마감된 회차입니다.';
  end if;

  -- 시간 겹침 검사: 휴무·마감된 회차(status <> 'open')는 겹침으로 보지 않음
  select s.session_date, s.start_time, s.end_time, c.name as center_name
  into v_overlap
  from applications a
  join sessions s on s.id = a.session_id
  join centers c on c.id = s.center_id
  where a.volunteer_id = auth.uid()
    and a.status = 'confirmed'
    and s.status = 'open'
    and s.session_date = v_session.session_date
    and s.start_time < v_session.end_time
    and s.end_time > v_session.start_time
    and s.id <> v_session.id
  limit 1;

  if found then
    raise exception '같은 시간대에 이미 신청한 봉사가 있습니다: % (%~%)',
      v_overlap.center_name, v_overlap.start_time, v_overlap.end_time;
  end if;

  select * into v_app from applications
  where session_id = p_session_id and volunteer_id = auth.uid();

  if found then
    if v_app.status = 'confirmed' then
      raise exception '이미 신청한 회차입니다.';
    end if;
    update applications
    set status = 'confirmed',
        cancelled_by = null,
        cancelled_at = null,
        cancelled_by_member_id = null,
        agreed_at = now(),
        applied_at = now()
    where id = v_app.id
    returning * into v_app;
  else
    insert into applications (session_id, volunteer_id, status, agreed_at)
    values (p_session_id, auth.uid(), 'confirmed', now())
    returning * into v_app;
  end if;

  update sessions set confirmed_count = confirmed_count + 1 where id = p_session_id;

  return v_app;
end;
$$;

grant execute on function public.apply_to_session(uuid) to authenticated;

-- ─────────────────────────────────────────────
-- 취소하기
--   봉사 시작 전까지 언제든 가능 (docs 3장 ⑦ — 마감 시한 없음)
-- ─────────────────────────────────────────────
create or replace function public.cancel_application(p_session_id uuid)
returns applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session sessions%rowtype;
  v_app applications%rowtype;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v_session from sessions where id = p_session_id for update;
  if not found then
    raise exception '존재하지 않는 회차입니다.';
  end if;

  if now() >= ((v_session.session_date + v_session.start_time) at time zone 'Asia/Seoul') then
    raise exception '이미 시작된 봉사는 취소할 수 없습니다.';
  end if;

  select * into v_app from applications
  where session_id = p_session_id and volunteer_id = auth.uid() and status = 'confirmed';

  if not found then
    raise exception '취소할 신청이 없습니다.';
  end if;

  update applications
  set status = 'cancelled', cancelled_by = 'volunteer', cancelled_at = now()
  where id = v_app.id
  returning * into v_app;

  update sessions set confirmed_count = greatest(confirmed_count - 1, 0) where id = p_session_id;

  return v_app;
end;
$$;

grant execute on function public.cancel_application(uuid) to authenticated;
