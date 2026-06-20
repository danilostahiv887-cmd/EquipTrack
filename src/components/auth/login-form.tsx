"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/server/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <form action={action} noValidate className="login-form">
      <div className="form-field">
        <label htmlFor="email">Електронна адреса</label>
        <input id="email" name="email" type="email" autoComplete="email" aria-invalid={Boolean(state.fieldErrors?.email)} />
        {state.fieldErrors?.email && <p className="field-error">{state.fieldErrors.email}</p>}
      </div>
      <div className="form-field">
        <label htmlFor="password">Пароль</label>
        <input id="password" name="password" type="password" autoComplete="current-password" aria-invalid={Boolean(state.fieldErrors?.password)} />
        {state.fieldErrors?.password && <p className="field-error">{state.fieldErrors.password}</p>}
      </div>
      {state.formError && <p className="form-error" role="alert">{state.formError}</p>}
      <button className="primary-button" type="submit" disabled={pending}>{pending ? "Виконуємо вхід…" : "Увійти до системи"}</button>
    </form>
  );
}
