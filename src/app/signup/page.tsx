"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Stage = "email" | "code" | "details";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStage("code");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError("인증번호가 올바르지 않거나 만료됐습니다.");
      return;
    }
    setStage("details");
  }

  async function checkNickname(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setNicknameStatus("idle");
      return;
    }
    setNicknameStatus("checking");
    const { data, error } = await supabase.rpc("is_nickname_taken", {
      p_nickname: trimmed,
    });
    if (error) {
      setNicknameStatus("idle");
      return;
    }
    setNicknameStatus(data ? "taken" : "available");
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (name.trim().length < 1) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (nickname.trim().length < 2) {
      setError("닉네임은 2자 이상이어야 합니다.");
      return;
    }
    if (nicknameStatus === "taken") {
      setError("이미 사용 중인 닉네임입니다.");
      return;
    }

    setLoading(true);

    const { error: pwError } = await supabase.auth.updateUser({ password });
    if (pwError) {
      setLoading(false);
      setError(pwError.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("로그인 정보를 확인할 수 없습니다. 다시 시도해주세요.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      name: name.trim(),
      nickname: nickname.trim(),
    });

    setLoading(false);

    if (profileError) {
      if (profileError.code === "23505") {
        if (profileError.message.includes("nickname")) {
          setError("이미 사용 중인 닉네임입니다.");
        } else {
          setError("이미 가입된 이메일입니다. 로그인해주세요.");
        }
      } else {
        setError(profileError.message);
      }
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-xl font-semibold">회원가입</h1>

        {stage === "email" && (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              이메일
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="you@example.com"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
            >
              {loading ? "보내는 중..." : "인증번호 받기"}
            </button>
          </form>
        )}

        {stage === "code" && (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {email} 로 인증번호를 보냈습니다. 메일함을 확인해주세요.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              인증번호 6자리
              <input
                type="text"
                required
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 tracking-widest dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="123456"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
            >
              {loading ? "확인 중..." : "확인"}
            </button>
          </form>
        )}

        {stage === "details" && (
          <form onSubmit={handleComplete} className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              이메일 인증이 완료됐습니다. 나머지 정보를 입력해주세요.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              비밀번호
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="8자 이상"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              이름
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="현장에서 확인할 이름 (가입 후 수정 불가)"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              닉네임
              <input
                type="text"
                required
                minLength={2}
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  checkNickname(e.target.value);
                }}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="화면에 보여질 이름"
              />
              {nicknameStatus === "checking" && (
                <span className="text-xs text-zinc-500">확인 중...</span>
              )}
              {nicknameStatus === "available" && (
                <span className="text-xs text-emerald-600">
                  사용할 수 있는 닉네임입니다.
                </span>
              )}
              {nicknameStatus === "taken" && (
                <span className="text-xs text-red-600">
                  이미 사용 중인 닉네임입니다.
                </span>
              )}
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
            >
              {loading ? "가입하는 중..." : "가입 완료"}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
