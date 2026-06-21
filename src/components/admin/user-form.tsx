"use client";

import { useActionState } from "react";
import {
  FieldError,
  FormFeedback,
  fieldClass,
  invalid,
  labelClass,
} from "@/components/ui/form-errors";
import { recordId } from "@/lib/format";
import {
  createUserAction,
  updateUserAction,
  type UserActionState,
} from "@/server/actions/users";

const initial: UserActionState = {};
const formKey = (values?: Record<string, string>) =>
  JSON.stringify(values ?? {});
const valueOf = (state: UserActionState, name: string, fallback = "") =>
  state.values?.[name] ?? fallback;

type UserFormData = {
  id?: unknown;
  fullName?: string;
  email?: string;
  role?: string;
  status?: string;
  position?: string;
};

export function UserForm({
  user,
  mode = "create",
}: {
  user?: UserFormData;
  mode?: "create" | "edit";
}) {
  const [state, action, pending] = useActionState(
    mode === "edit" ? updateUserAction : createUserAction,
    initial,
  );
  const fieldErrors = state.fieldErrors;

  return (
    <form
      key={formKey(state.values)}
      action={action}
      noValidate
      className="passport-form"
    >
      {mode === "edit" && (
        <input type="hidden" name="userId" value={recordId(user?.id ?? "")} />
      )}
      <div className="form-grid">
        <label className={labelClass(fieldErrors, "fullName")}>
          Повне ім’я
          <input
            name="fullName"
            defaultValue={valueOf(state, "fullName", user?.fullName ?? "")}
            className={fieldClass(fieldErrors, "fullName")}
            aria-invalid={invalid(fieldErrors, "fullName")}
          />
          <FieldError errors={fieldErrors} name="fullName" />
        </label>

        <label className={labelClass(fieldErrors, "email")}>
          Електронна адреса
          <input
            name="email"
            type="email"
            defaultValue={valueOf(state, "email", user?.email ?? "")}
            className={fieldClass(fieldErrors, "email")}
            aria-invalid={invalid(fieldErrors, "email")}
          />
          <FieldError errors={fieldErrors} name="email" />
        </label>

        <label className={labelClass(fieldErrors, "password")}>
          Пароль
          <input
            name="password"
            type="password"
            placeholder={
              mode === "edit" ? "Залиште порожнім, щоб не змінювати" : undefined
            }
            className={fieldClass(fieldErrors, "password")}
            aria-invalid={invalid(fieldErrors, "password")}
          />
          <FieldError errors={fieldErrors} name="password" />
        </label>

        <label className={labelClass(fieldErrors, "role")}>
          Роль
          <select
            name="role"
            defaultValue={valueOf(state, "role", user?.role ?? "staff")}
            className={fieldClass(fieldErrors, "role")}
            aria-invalid={invalid(fieldErrors, "role")}
          >
            <option value="staff">Працівник</option>
            <option value="inventory_manager">Менеджер обліку</option>
            <option value="admin">Адміністратор</option>
          </select>
          <FieldError errors={fieldErrors} name="role" />
        </label>

        <label className={labelClass(fieldErrors, "position")}>
          Посада
          <input
            name="position"
            defaultValue={valueOf(state, "position", user?.position ?? "")}
            className={fieldClass(fieldErrors, "position")}
            aria-invalid={invalid(fieldErrors, "position")}
          />
          <FieldError errors={fieldErrors} name="position" />
        </label>

        {mode === "edit" && (
          <label className={labelClass(fieldErrors, "status")}>
            Стан
            <select
              name="status"
              defaultValue={valueOf(state, "status", user?.status ?? "active")}
              className={fieldClass(fieldErrors, "status")}
              aria-invalid={invalid(fieldErrors, "status")}
            >
              <option value="active">Активний</option>
              <option value="inactive">Неактивний</option>
            </select>
            <FieldError errors={fieldErrors} name="status" />
          </label>
        )}
      </div>

      <FormFeedback
        formError={state.formError}
        fieldErrors={fieldErrors}
        success={state.success}
      />
      <button className="primary-button" type="submit" disabled={pending}>
        {pending
          ? "Зберігаємо…"
          : mode === "edit"
            ? "Зберегти користувача"
            : "Створити користувача"}
      </button>
    </form>
  );
}
