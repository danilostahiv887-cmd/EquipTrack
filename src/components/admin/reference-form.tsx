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
  createReferenceAction,
  updateReferenceAction,
  type ReferenceActionState,
} from "@/server/actions/references";

const initial: ReferenceActionState = {};
const valueOf = (state: ReferenceActionState, name: string, fallback = "") =>
  state.values?.[name] ?? fallback;

type ReferenceKind = "building" | "room_type" | "category" | "supplier";
type ReferenceFormData = {
  id?: unknown;
  name?: string;
  type?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  note?: string;
};

export function ReferenceForm({
  kind,
  record,
  mode = "create",
}: {
  kind: ReferenceKind;
  record?: ReferenceFormData;
  mode?: "create" | "edit";
}) {
  const [state, action, pending] = useActionState(
    mode === "edit" ? updateReferenceAction : createReferenceAction,
    initial,
  );
  const fieldErrors = state.fieldErrors;

  return (
    <form action={action} noValidate className="passport-form">
      <input type="hidden" name="kind" value={kind} />
      {mode === "edit" && (
        <input
          type="hidden"
          name="referenceId"
          value={recordId(record?.id ?? "")}
        />
      )}
      <div className="form-grid">
        <label className={labelClass(fieldErrors, "name", "wide-field")}>
          Назва
          <input
            name="name"
            defaultValue={valueOf(state, "name", record?.name ?? "")}
            className={fieldClass(fieldErrors, "name")}
            aria-invalid={invalid(fieldErrors, "name")}
          />
          <FieldError errors={fieldErrors} name="name" />
        </label>
        {kind === "supplier" && (
          <>
            <label className={labelClass(fieldErrors, "type")}>
              Тип
              <select
                name="type"
                defaultValue={valueOf(
                  state,
                  "type",
                  record?.type ?? "постачальник",
                )}
                className={fieldClass(fieldErrors, "type")}
                aria-invalid={invalid(fieldErrors, "type")}
              >
                <option value="постачальник">Постачальник</option>
                <option value="донор">Донор</option>
                <option value="сервіс">Сервіс</option>
                <option value="підрядник">Підрядник</option>
              </select>
              <FieldError errors={fieldErrors} name="type" />
            </label>

            <label className={labelClass(fieldErrors, "contactPerson")}>
              Контактна особа
              <input
                name="contactPerson"
                placeholder="ПІБ або відповідальний менеджер"
                defaultValue={valueOf(
                  state,
                  "contactPerson",
                  record?.contactPerson ?? "",
                )}
                className={fieldClass(fieldErrors, "contactPerson")}
                aria-invalid={invalid(fieldErrors, "contactPerson")}
              />
              <FieldError errors={fieldErrors} name="contactPerson" />
            </label>

            <label className={labelClass(fieldErrors, "phone")}>
              Телефон
              <input
                name="phone"
                placeholder="+380..."
                defaultValue={valueOf(state, "phone", record?.phone ?? "")}
                className={fieldClass(fieldErrors, "phone")}
                aria-invalid={invalid(fieldErrors, "phone")}
              />
              <FieldError errors={fieldErrors} name="phone" />
            </label>

            <label className={labelClass(fieldErrors, "email")}>
              Email
              <input
                name="email"
                type="email"
                placeholder="supplier@example.com"
                defaultValue={valueOf(state, "email", record?.email ?? "")}
                className={fieldClass(fieldErrors, "email")}
                aria-invalid={invalid(fieldErrors, "email")}
              />
              <FieldError errors={fieldErrors} name="email" />
            </label>

            <label className={labelClass(fieldErrors, "note", "wide-field")}>
              Примітка
              <textarea
                name="note"
                placeholder="Умови гарантії, спосіб закупівлі або короткий контекст співпраці"
                defaultValue={valueOf(state, "note", record?.note ?? "")}
                className={fieldClass(fieldErrors, "note")}
                aria-invalid={invalid(fieldErrors, "note")}
              />
              <FieldError errors={fieldErrors} name="note" />
            </label>
          </>
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
            ? "Зберегти запис"
            : "Створити запис"}
      </button>
    </form>
  );
}
