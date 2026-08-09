import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nickname: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .maybeSingle();
    nickname = profile?.nickname ?? null;
  }

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <Link href="/" className="font-semibold">
        봉사모아
      </Link>
      {user ? (
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {nickname ?? "회원"}
          </span>
          <LogoutButton />
        </div>
      ) : (
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login">로그인</Link>
          <Link href="/signup">회원가입</Link>
        </div>
      )}
    </header>
  );
}
