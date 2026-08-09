"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { FormField, FormError, SubmitButton } from "@/components/ui/FormControls";

type NicknameStatus = "idle" | "checking" | "available" | "taken";

export interface ProfileSetupValues {
  name: string;
  nickname: string;
  password?: string;
}

interface ProfileSetupFormProps {
  // 이메일·비밀번호 가입은 비밀번호 칸이 필요하지만,
  // 나중에 카카오 로그인으로 들어온 사람은 비밀번호가 없어도 됩니다.
  requirePassword?: boolean;
  description?: string;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: ProfileSetupValues) => Promise<string | null>;
}

export default function ProfileSetupForm({
  requirePassword = false,
  description,
  submitLabel,
  submittingLabel,
  onSubmit,
}: ProfileSetupFormProps) {
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (requirePassword && password.length < 8) {
      setError(copy.errors.passwordTooShort);
      return;
    }
    if (name.trim().length < 1) {
      setError(copy.errors.nameRequired);
      return;
    }
    if (nickname.trim().length < 2) {
      setError(copy.errors.nicknameTooShort);
      return;
    }
    if (nicknameStatus === "taken") {
      setError(copy.errors.nicknameTaken);
      return;
    }

    setLoading(true);
    const errorMessage = await onSubmit({
      name: name.trim(),
      nickname: nickname.trim(),
      password: requirePassword ? password : undefined,
    });
    setLoading(false);

    if (errorMessage) {
      setError(errorMessage);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      )}

      {requirePassword && (
        <FormField
          label={copy.auth.passwordLabel}
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={copy.auth.passwordPlaceholder}
        />
      )}

      <FormField
        label={copy.auth.nameLabel}
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={copy.auth.namePlaceholder}
      />

      <FormField
        label={copy.auth.nicknameLabel}
        type="text"
        required
        minLength={2}
        value={nickname}
        onChange={(e) => {
          setNickname(e.target.value);
          checkNickname(e.target.value);
        }}
        placeholder={copy.auth.nicknamePlaceholder}
        hint={
          <>
            {nicknameStatus === "checking" && (
              <span className="text-xs text-zinc-500">
                {copy.auth.nicknameChecking}
              </span>
            )}
            {nicknameStatus === "available" && (
              <span className="text-xs text-emerald-600">
                {copy.auth.nicknameAvailable}
              </span>
            )}
            {nicknameStatus === "taken" && (
              <span className="text-xs text-red-600">{copy.auth.nicknameTaken}</span>
            )}
          </>
        }
      />

      <FormError message={error} />

      <SubmitButton loading={loading} loadingLabel={submittingLabel}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
