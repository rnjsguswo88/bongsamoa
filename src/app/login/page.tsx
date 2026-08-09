"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { FormField, FormError, SubmitButton } from "@/components/ui/FormControls";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(copy.errors.invalidLogin);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-xl font-semibold">{copy.auth.loginTitle}</h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <FormField
            label={copy.auth.emailLabel}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={copy.auth.emailPlaceholder}
          />
          <FormField
            label={copy.auth.passwordLabel}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormError message={error} />
          <SubmitButton loading={loading} loadingLabel={copy.auth.loggingIn}>
            {copy.auth.loginButton}
          </SubmitButton>
        </form>

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          {copy.auth.noAccount}{" "}
          <Link href="/signup" className="underline">
            {copy.auth.signupTitle}
          </Link>
        </p>
      </div>
    </div>
  );
}
