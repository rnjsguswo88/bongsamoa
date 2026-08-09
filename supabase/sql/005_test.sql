-- 봉사모아 · 2단계 완료 테스트
-- 센터 1곳 + 회차 3개를 손으로 넣고, 신청 함수를 실행해 confirmed_count가 오르는지 확인

-- ═══════════════════════════════════════════
-- STEP 1 — 이 부분만 먼저 붙여넣고 Run
-- ═══════════════════════════════════════════
do $$
declare
  v_user_id uuid := '25dfaa97-3f6c-438f-be26-b56456a72240';
  v_center_id uuid;
  v_schedule_id uuid;
begin
  insert into profiles (id, name, nickname)
  values (v_user_id, '김테스트', '테스트봉사자')
  on conflict (id) do nothing;

  insert into centers (name, category, contact_phone, region_sido, region_sigungu, status, created_by)
  values ('테스트 보호소', 'animal', '02-1234-5678', '서울', '마포구', 'approved', v_user_id)
  returning id into v_center_id;

  insert into schedules (center_id, title, repeat_start_date, repeat_end_date, repeat_weekdays, start_time, end_time, capacity, open_days_before, created_by)
  values (v_center_id, '테스트 정기봉사', current_date, current_date + interval '1 month', array[0,1,2,3,4,5,6], '10:00', '13:00', 2, 0, v_user_id)
  returning id into v_schedule_id;

  insert into sessions (schedule_id, center_id, session_date, start_time, end_time, capacity, open_days_before, status)
  values
    (v_schedule_id, v_center_id, current_date,     '10:00', '13:00', 2, 0, 'open'),
    (v_schedule_id, v_center_id, current_date + 1, '10:00', '13:00', 2, 0, 'open'),
    (v_schedule_id, v_center_id, current_date + 2, '10:00', '13:00', 2, 0, 'open');
end $$;

-- 방금 만든 회차 3개를 보여줍니다. 그중 하나의 session_id 값을 복사하세요.
select s.id as session_id, s.session_date, s.capacity, s.confirmed_count
from sessions s
join centers c on c.id = s.center_id
where c.name = '테스트 보호소'
order by s.session_date;

-- ═══════════════════════════════════════════
-- STEP 2 — 위 결과에서 session_id 하나를 복사해서
-- 아래 두 줄의 '여기에-session_id-붙여넣기' 를 바꾸고, 이 블록만 새 쿼리로 Run
-- ═══════════════════════════════════════════
-- select set_config('request.jwt.claim.sub', '25dfaa97-3f6c-438f-be26-b56456a72240', false);
-- select public.apply_to_session('여기에-session_id-붙여넣기');

-- ═══════════════════════════════════════════
-- STEP 3 — 같은 session_id로 확인 (confirmed_count가 0 → 1 로 올라가야 함)
-- ═══════════════════════════════════════════
-- select id, session_date, capacity, confirmed_count from sessions where id = '여기에-session_id-붙여넣기';
