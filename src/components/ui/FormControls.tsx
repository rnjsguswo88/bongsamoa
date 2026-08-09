import type { InputHTMLAttributes, ReactNode } from "react";

const inputStyle =
  "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
}

// 로그인·회원가입·(나중에 만들 센터 정보 수정 등) 모든 입력 칸이
// 같은 모양을 쓰도록 한 곳에 둡니다.
export function FormField({ label, hint, className, ...inputProps }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        {...inputProps}
        className={className ? `${inputStyle} ${className}` : inputStyle}
      />
      {hint}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-red-600">{message}</p>;
}

interface SubmitButtonProps {
  loading: boolean;
  loadingLabel: string;
  children: ReactNode;
}

export function SubmitButton({ loading, loadingLabel, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
