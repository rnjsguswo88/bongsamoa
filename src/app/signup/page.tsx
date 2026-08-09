"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { FormField, FormError, SubmitButton } from "@/components/ui/FormControls";
import ProfileSetupForm, {
  type ProfileSetupValues,
} from "@/components/ProfileSetupForm";

type Stage = "email" | "code" | "details";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

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
      setError(copy.errors.invalidCode);
      return;
    }
    setStage("details");
  }

  async function handleComplete(values: ProfileSetupValues): Promise<string | null> {
    const { error: pwError } = await supabase.auth.updateUser({
      password: values.password,
    });
    if (pwError) {
      return pwError.message;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return copy.errors.sessionMissing;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      name: values.name,
      nickname: values.nickname,
    });

    if (profileError) {
      if (profileError.code === "23505") {
        return profileError.message.includes("nickname")
          ? copy.errors.nicknameTaken
          : copy.errors.emailTaken;
      }
      return profileError.message;
    }

    router.push("/");
    router.refresh();
    return null;
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-xl font-semibold">{copy.auth.signupTitle}</h1>

        {stage === "email" && (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            <FormField
              label={copy.auth.emailLabel}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.auth.emailPlaceholder}
            />
            <FormError message={error} />
            <SubmitButton loading={loading} loadingLabel={copy.auth.sendingCode}>
              {copy.auth.sendCode}
            </SubmitButton>
          </form>
        )}

        {stage === "code" && (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {copy.auth.codeSentNotice(email)}
            </p>
            <FormField
              label={copy.auth.codeLabel}
              type="text"
              required
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={copy.auth.codePlaceholder}
              className="tracking-widest"
            />
            <FormError message={error} />
            <SubmitButton loading={loading} loadingLabel={copy.auth.verifyingCode}>
              {copy.auth.verifyCode}
            </SubmitButton>
          </form>
        )}

        {stage === "details" && (
          <ProfileSetupForm
            requirePassword
            description={copy.auth.emailVerifiedNotice}
            submitLabel={copy.auth.completeSignup}
            submittingLabel={copy.auth.completingSignup}
            onSubmit={handleComplete}
          />
        )}

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          {copy.auth.haveAccount}{" "}
          <Link href="/login" className="underline">
            {copy.auth.loginButton}
          </Link>
        </p>
      </div>
    </div>
  );
}
