-- 봉사모아 · 가입 전 이메일 중복 확인 함수
-- 회원가입 화면에서 인증번호를 보내기 "전에" 이미 가입된 이메일인지 확인합니다.
-- (안 하면: 인증 메일이 나간 뒤에야 "이미 가입됨"을 알게 되는 헛수고가 생김)
--
-- auth.users 는 profiles 와 달리 email 을 갖고 있어서, 여기서 직접 조회합니다.
-- true/false 하나만 돌려주므로 비밀번호·기타 정보는 노출되지 않습니다.

create or replace function public.is_email_registered(p_email text)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(trim(p_email))
  );
$$;

grant execute on function public.is_email_registered(text) to anon, authenticated;
