-- 봉사모아 · 데이터 규칙 (트리거)
-- docs/02_데이터설계.md 2-1장, 2-3장, 3장 ⑤ 기준
-- 001_tables.sql 실행 후에 이걸 실행하세요.

-- ─────────────────────────────────────────────
-- 닉네임: 대소문자·공백만 달라도 같은 것으로 봄
-- ─────────────────────────────────────────────
alter table profiles drop constraint if exists profiles_nickname_key;

create unique index uq_profiles_nickname_ci
  on profiles (lower(trim(nickname)));

-- ─────────────────────────────────────────────
-- 이름(name)은 가입 후 수정 불가 — 운영자만 예외
-- ─────────────────────────────────────────────
create or replace function public.prevent_name_change()
returns trigger
language plpgsql
as $$
begin
  if new.name is distinct from old.name
     and not coalesce((select is_admin from profiles where id = auth.uid()), false) then
    raise exception '이름은 수정할 수 없습니다. 운영자에게 요청하세요.';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_name_immutable
  before update on profiles
  for each row
  execute function public.prevent_name_change();

-- ─────────────────────────────────────────────
-- schedules.updated_at 자동 갱신
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_schedules_updated_at
  before update on schedules
  for each row
  execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 마지막 소유자 보호 (규칙 ⑤)
-- center_members 에서 owner가 0명이 되는 삭제·역할변경을 막음
-- ─────────────────────────────────────────────
create or replace function public.protect_last_owner()
returns trigger
language plpgsql
as $$
declare
  remaining_owners int;
begin
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    select count(*) into remaining_owners
    from center_members
    where center_id = old.center_id and role = 'owner' and id <> old.id;

    if remaining_owners = 0 then
      raise exception '센터에는 최소 1명의 소유자(owner)가 있어야 합니다.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_protect_last_owner
  before update or delete on center_members
  for each row
  execute function public.protect_last_owner();
