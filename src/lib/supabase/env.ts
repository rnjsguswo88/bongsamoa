// 환경변수를 복사·붙여넣기 하는 과정에서 눈에 안 보이는 문자
// (제로폭 공백, BOM, non-breaking space, 줄바꿈, 앞뒤 공백)가 섞여 들어가면
// fetch 헤더 생성이 깨지는 문제가 있어, 여기서 한 번 걸러냅니다.
const INVISIBLE_CHAR_CODES = [0x200b, 0x200c, 0x200d, 0xfeff, 0x00a0];

function sanitizeEnvValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  }
  let result = "";
  for (const ch of value) {
    if (INVISIBLE_CHAR_CODES.includes(ch.codePointAt(0) ?? -1)) continue;
    result += ch;
  }
  return result.trim();
}

export const supabaseUrl = sanitizeEnvValue(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);

export const supabaseAnonKey = sanitizeEnvValue(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);
