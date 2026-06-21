import { cn } from "@/lib/utils";

export type FieldErrorValue = string | string[] | undefined;
export type FieldErrors = Record<string, FieldErrorValue> | undefined;

export function errorMessages(value: FieldErrorValue) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

export function fieldError(errors: FieldErrors, name: string) {
  return errorMessages(errors?.[name]);
}

export function invalid(errors: FieldErrors, name: string) {
  return fieldError(errors, name).length > 0;
}

export function fieldClass(errors: FieldErrors, name: string, className?: string) {
  return cn(className, invalid(errors, name) && "field-invalid-control");
}

export function labelClass(errors: FieldErrors, name: string, className?: string) {
  return cn(className, invalid(errors, name) && "field-invalid-label");
}

export function FieldError({ errors, name }: { errors: FieldErrors; name: string }) {
  const messages = fieldError(errors, name);
  if (messages.length === 0) return null;
  return (
    <ul className="field-error-list" role="alert">
      {messages.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
    </ul>
  );
}

export function FormFeedback({ formError, fieldErrors, success }: { formError?: string; fieldErrors?: FieldErrors; success?: string }) {
  const errors = [formError, ...Object.values(fieldErrors ?? {}).flatMap(errorMessages)].filter((message): message is string => Boolean(message));
  return <>
    {errors.length > 0 && <div className="form-error-list" role="alert">
      <p>Перевірте форму:</p>
      <ul>{errors.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}</ul>
    </div>}
    {success && <p className="success-note">{success}</p>}
  </>;
}
