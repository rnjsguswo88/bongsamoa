-- 봉사모아 · 닉네임 중복 확인 함수
-- 회원가입 화면에서 "이 닉네임 쓸 수 있나요?" 를 실시간으로 물어볼 때 씀
-- profiles 테이블 자체는 남의 정보를 못 보게 막아뒀으므로(RLS),
-- true/false 하나만 돌려주는 안전한 함수를 따로 둡니다.

create or replace function public.is_nickname_taken(p_nickname text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where lower(trim(nickname)) = lower(trim(p_nickname))
  );
$$;

grant execute on function public.is_nickname_taken(text) to anon, authenticated;
