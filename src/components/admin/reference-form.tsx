"use client";

import { useActionState } from "react";
import { FieldError, FormFeedback, fieldClass, invalid, labelClass } from "@/components/ui/form-errors";
import { recordId } from "@/lib/format";
import { createReferenceAction, updateReferenceAction, type ReferenceActionState } from "@/server/actions/references";

const initial: ReferenceActionState = {};

type ReferenceKind = "building" | "room_type" | "category";
type ReferenceFormData = { id?: unknown; name?: string };

export function ReferenceForm({ kind, record, mode = "create" }: { kind: ReferenceKind; record?: ReferenceFormData; mode?: "create" | "edit" }) {
  const [state, action, pending] = useActionState(mode === "edit" ? updateReferenceAction : createReferenceAction, initial);
  const fieldErrors = state.fieldErrors;

  return (
    <form action={action} noValidate className="passport-form">
      <input type="hidden" name="kind" value={kind} />
      {mode === "edit" && <input type="hidden" name="referenceId" value={recordId(record?.id ?? "")} />}
      <div className="form-grid">
        <label className={labelClass(fieldErrors, "name", "wide-field")}>
          Назва
          <input
            name="name"
            defaultValue={record?.name ?? ""}
            className={fieldClass(fieldErrors, "name")}
            aria-invalid={invalid(fieldErrors, "name")}
          />
          <FieldError errors={fieldErrors} name="name" />
        </label>
      </div>
      <FormFeedback formError={state.formError} fieldErrors={fieldErrors} success={state.success} />
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Зберігаємо…" : mode === "edit" ? "Зберегти запис" : "Створити запис"}
      </button>
    </form>
  );
}
