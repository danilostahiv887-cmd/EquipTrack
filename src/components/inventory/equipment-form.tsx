"use client";

import { useActionState } from "react";
import { FileUpload } from "@/components/files/file-upload";
import {
  FieldError,
  FormFeedback,
  fieldClass,
  invalid,
  labelClass,
} from "@/components/ui/form-errors";
import { recordId } from "@/lib/format";
import {
  createEquipmentAction,
  updateEquipmentAction,
  type EquipmentActionState,
} from "@/server/actions/equipment";

const initial: EquipmentActionState = {};
const valueOf = (
  state: EquipmentActionState,
  name: string,
  fallback: string | number = "",
) => state.values?.[name] ?? fallback;

type EquipmentFormData = {
  id?: unknown;
  name?: string;
  categoryId?: string;
  manufacturer?: string;
  model?: string;
  price?: number;
  acquisitionDate?: string;
  condition?: string;
};

export function EquipmentForm({
  categories,
  equipment,
  mode = "create",
}: {
  categories: Array<{ id: unknown; name: string }>;
  equipment?: EquipmentFormData;
  mode?: "create" | "edit";
}) {
  const [state, action, pending] = useActionState(
    mode === "edit" ? updateEquipmentAction : createEquipmentAction,
    initial,
  );
  const fieldErrors = state.fieldErrors;

  return (
    <form noValidate action={action} className="passport-form">
      {mode === "edit" && (
        <input
          type="hidden"
          name="equipmentId"
          value={recordId(equipment?.id ?? "")}
        />
      )}

      <div className="form-grid">
        <label className={labelClass(fieldErrors, "name")}>
          Назва моделі або типу
          <input
            name="name"
            placeholder="Наприклад: Ноутбук Dell Latitude 5420"
            defaultValue={valueOf(state, "name", equipment?.name ?? "")}
            className={fieldClass(fieldErrors, "name")}
            aria-invalid={invalid(fieldErrors, "name")}
          />
          <FieldError errors={fieldErrors} name="name" />
        </label>

        <label className={labelClass(fieldErrors, "categoryId")}>
          Категорія
          <select
            name="categoryId"
            defaultValue={valueOf(
              state,
              "categoryId",
              equipment?.categoryId ?? "",
            )}
            className={fieldClass(fieldErrors, "categoryId")}
            aria-invalid={invalid(fieldErrors, "categoryId")}
          >
            <option value="" disabled>
              Оберіть категорію
            </option>
            {categories.map((entry) => (
              <option key={recordId(entry.id)} value={recordId(entry.id)}>
                {entry.name}
              </option>
            ))}
          </select>
          <FieldError errors={fieldErrors} name="categoryId" />
        </label>

        <label className={labelClass(fieldErrors, "manufacturer")}>
          Виробник
          <input
            name="manufacturer"
            defaultValue={valueOf(
              state,
              "manufacturer",
              equipment?.manufacturer ?? "",
            )}
            className={fieldClass(fieldErrors, "manufacturer")}
            aria-invalid={invalid(fieldErrors, "manufacturer")}
          />
          <FieldError errors={fieldErrors} name="manufacturer" />
        </label>

        <label className={labelClass(fieldErrors, "model")}>
          Модель
          <input
            name="model"
            defaultValue={valueOf(state, "model", equipment?.model ?? "")}
            className={fieldClass(fieldErrors, "model")}
            aria-invalid={invalid(fieldErrors, "model")}
          />
          <FieldError errors={fieldErrors} name="model" />
        </label>

        <label className={labelClass(fieldErrors, "condition")}>
          Типовий технічний стан
          <select
            name="condition"
            defaultValue={valueOf(
              state,
              "condition",
              equipment?.condition ?? "good",
            )}
            className={fieldClass(fieldErrors, "condition")}
            aria-invalid={invalid(fieldErrors, "condition")}
          >
            <option value="new">Нове</option>
            <option value="good">Справне</option>
            <option value="satisfactory">Задовільне</option>
            <option value="needs_repair">Потребує ремонту</option>
            <option value="damaged">Пошкоджене</option>
            <option value="unusable">Непридатне</option>
          </select>
          <FieldError errors={fieldErrors} name="condition" />
        </label>

        <label className={labelClass(fieldErrors, "price")}>
          Орієнтовна вартість одиниці
          <input
            name="price"
            inputMode="decimal"
            defaultValue={valueOf(state, "price", equipment?.price ?? 0)}
            className={fieldClass(fieldErrors, "price")}
            aria-invalid={invalid(fieldErrors, "price")}
          />
          <FieldError errors={fieldErrors} name="price" />
        </label>

        <label className={labelClass(fieldErrors, "acquisitionDate")}>
          Типова дата надходження
          <input
            name="acquisitionDate"
            type="date"
            defaultValue={valueOf(
              state,
              "acquisitionDate",
              equipment?.acquisitionDate ?? "",
            )}
            className={fieldClass(fieldErrors, "acquisitionDate")}
            aria-invalid={invalid(fieldErrors, "acquisitionDate")}
          />
          <FieldError errors={fieldErrors} name="acquisitionDate" />
        </label>

        <FileUpload label="Фото моделі або типу" />
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
            ? "Зберегти картку"
            : "Створити картку обладнання"}
      </button>
    </form>
  );
}
