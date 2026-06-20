"use client";

import { useActionState } from "react";
import { createUserAction, type UserActionState } from "@/server/actions/users";

export function UserForm() { const [state, action, pending] = useActionState(createUserAction, {} as UserActionState); return <form action={action} noValidate className="passport-form"><div className="form-grid"><label>Повне ім’я<input name="fullName"/></label><label>Електронна адреса<input name="email" type="email"/></label><label>Пароль<input name="password" type="password"/></label><label>Роль<select name="role" defaultValue="staff"><option value="staff">Працівник</option><option value="inventory_manager">Менеджер обліку</option><option value="admin">Адміністратор</option></select></label><label>Посада<input name="position"/></label></div>{state.formError && <p className="form-error">{state.formError}</p>}{state.success && <p className="success-note">{state.success}</p>}<button className="primary-button" type="submit" disabled={pending}>{pending ? "Створюємо…" : "Створити користувача"}</button></form>; }
