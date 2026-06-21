import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  error,
  hint,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
}) {
  return (
    <div className="form-field">
      <label
        htmlFor={input.id}
        className={error ? "field-invalid-label" : undefined}
      >
        {label}
      </label>
      <input
        {...input}
        className={cn(input.className, error && "field-invalid-control")}
        aria-invalid={Boolean(error)}
      />
      {hint && <small>{hint}</small>}
      {error && (
        <ul className="field-error-list" role="alert">
          <li>{error}</li>
        </ul>
      )}
    </div>
  );
}
