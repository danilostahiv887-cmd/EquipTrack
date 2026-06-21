"use client";

import { useActionState } from "react";
import { FieldError, FormFeedback, fieldClass, invalid, labelClass } from "@/components/ui/form-errors";
import { loginAction, type LoginState } from "@/server/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const fieldErrors = state.fieldErrors;

  return (
    <form action={action} noValidate className="login-form">
      <div className="form-field">
        <label htmlFor="email" className={labelClass(fieldErrors, "email")}>Електронна адреса</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className={fieldClass(fieldErrors, "email")}
          aria-invalid={invalid(fieldErrors, "email")}
        />
        <FieldError errors={fieldErrors} name="email" />
      </div>

      <div className="form-field">
        <label htmlFor="password" className={labelClass(fieldErrors, "password")}>Пароль</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={fieldClass(fieldErrors, "password")}
          aria-invalid={invalid(fieldErrors, "password")}
        />
        <FieldError errors={fieldErrors} name="password" />
      </div>

      <FormFeedback formError={state.formError} fieldErrors={fieldErrors} />
      <button className="primary-button" type="submit" disabled={pending}>{pending ? "Виконуємо вхід…" : "Увійти до системи"}</button>
    </form>
  );
}
