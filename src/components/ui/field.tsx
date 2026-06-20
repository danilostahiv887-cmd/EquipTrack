import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({ label, error, hint, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode }) {
  return <div className="form-field"><label htmlFor={input.id}>{label}</label><input {...input} aria-invalid={Boolean(error)} />{hint && <small>{hint}</small>}{error && <p className="field-error">{error}</p>}</div>;
}
