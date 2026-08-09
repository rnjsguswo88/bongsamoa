import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 카카오 같은 OAuth 로그인을 붙이면, 카카오가 로그인 처리를 끝내고
// 사용자를 이 주소(/auth/callback?code=...)로 돌려보냅니다.
// 지금은 이 경로로 오는 버튼이 없어서 호출될 일이 없습니다 — 자리만 미리 만들어둔 것입니다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=인증에 실패했습니다`);
}
