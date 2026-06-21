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
  createEquipmentInstanceAction,
  updateEquipmentInstanceAction,
  type EquipmentActionState,
} from "@/server/actions/equipment";

const initial: EquipmentActionState = {};
const valueOf = (
  state: EquipmentActionState,
  name: string,
  fallback: string | number = "",
) => state.values?.[name] ?? fallback;

type InstanceFormData = {
  id?: unknown;
  equipmentId?: string;
  inventoryNumber?: string;
  serialNumber?: string;
  currentRoomId?: string;
  currentResponsibleId?: string;
  status?: string;
  condition?: string;
  price?: number;
  acquisitionDate?: string;
};

export function EquipmentInstanceForm({
  equipmentId,
  rooms,
  users,
  instance,
  defaultPrice,
  defaultAcquisitionDate,
  mode = "create",
}: {
  equipmentId: string;
  rooms: Array<{ id: unknown; number?: string; name?: string }>;
  users: Array<{ id: unknown; fullName?: string }>;
  instance?: InstanceFormData;
  defaultPrice?: number;
  defaultAcquisitionDate?: string;
  mode?: "create" | "edit";
}) {
  const [state, action, pending] = useActionState(
    mode === "edit"
      ? updateEquipmentInstanceAction
      : createEquipmentInstanceAction,
    initial,
  );
  const fieldErrors = state.fieldErrors;

  return (
    <form noValidate action={action} className="passport-form">
      <input type="hidden" name="equipmentId" value={equipmentId} />
      {mode === "edit" && (
        <input
          type="hidden"
          name="instanceId"
          value={recordId(instance?.id ?? "")}
        />
      )}

      <div className="form-grid">
        <label className={labelClass(fieldErrors, "inventoryNumber")}>
          Інвентарний номер екземпляра
          <input
            name="inventoryNumber"
            placeholder="Наприклад: ДМТФК-0001"
            defaultValue={valueOf(
              state,
              "inventoryNumber",
              instance?.inventoryNumber ?? "",
            )}
            className={fieldClass(fieldErrors, "inventoryNumber")}
            aria-invalid={invalid(fieldErrors, "inventoryNumber")}
          />
          <FieldError errors={fieldErrors} name="inventoryNumber" />
        </label>

        <label className={labelClass(fieldErrors, "serialNumber")}>
          Серійний номер
          <input
            name="serialNumber"
            placeholder="Наприклад: DMTC-2026-0001"
            defaultValue={valueOf(
              state,
              "serialNumber",
              instance?.serialNumber ?? "",
            )}
            className={fieldClass(fieldErrors, "serialNumber")}
            aria-invalid={invalid(fieldErrors, "serialNumber")}
          />
          <FieldError errors={fieldErrors} name="serialNumber" />
        </label>

        <label className={labelClass(fieldErrors, "roomId")}>
          Приміщення
          <select
            name="roomId"
            defaultValue={valueOf(
              state,
              "roomId",
              instance?.currentRoomId ?? "",
            )}
            className={fieldClass(fieldErrors, "roomId")}
            aria-invalid={invalid(fieldErrors, "roomId")}
          >
            <option value="" disabled>
              Оберіть приміщення
            </option>
            {rooms.map((entry) => (
              <option key={recordId(entry.id)} value={recordId(entry.id)}>
                {entry.number}
                {entry.name ? ` · ${entry.name}` : ""}
              </option>
            ))}
          </select>
          <FieldError errors={fieldErrors} name="roomId" />
        </label>

        <label className={labelClass(fieldErrors, "responsibleId")}>
          Відповідальна особа
          <select
            name="responsibleId"
            defaultValue={valueOf(
              state,
              "responsibleId",
              instance?.currentResponsibleId ?? "",
            )}
            className={fieldClass(fieldErrors, "responsibleId")}
            aria-invalid={invalid(fieldErrors, "responsibleId")}
          >
            <option value="" disabled>
              Оберіть особу
            </option>
            {users.map((entry) => (
              <option key={recordId(entry.id)} value={recordId(entry.id)}>
                {entry.fullName}
              </option>
            ))}
          </select>
          <FieldError errors={fieldErrors} name="responsibleId" />
        </label>

        <label className={labelClass(fieldErrors, "status")}>
          Обліковий стан
          <select
            name="status"
            defaultValue={valueOf(
              state,
              "status",
              instance?.status ?? "active",
            )}
            className={fieldClass(fieldErrors, "status")}
            aria-invalid={invalid(fieldErrors, "status")}
          >
            <option value="active">Активне</option>
            <option value="in_storage">На складі</option>
            <option value="in_repair">У ремонті</option>
            <option value="lost">Втрачено</option>
            <option value="written_off">Списано</option>
            <option value="archived">Архів</option>
          </select>
          <FieldError errors={fieldErrors} name="status" />
        </label>

        <label className={labelClass(fieldErrors, "condition")}>
          Технічний стан
          <select
            name="condition"
            defaultValue={valueOf(
              state,
              "condition",
              instance?.condition ?? "good",
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
          Вартість екземпляра
          <input
            name="price"
            inputMode="decimal"
            defaultValue={valueOf(
              state,
              "price",
              instance?.price ?? defaultPrice ?? 0,
            )}
            className={fieldClass(fieldErrors, "price")}
            aria-invalid={invalid(fieldErrors, "price")}
          />
          <FieldError errors={fieldErrors} name="price" />
        </label>

        <label className={labelClass(fieldErrors, "acquisitionDate")}>
          Дата надходження
          <input
            name="acquisitionDate"
            type="date"
            defaultValue={valueOf(
              state,
              "acquisitionDate",
              instance?.acquisitionDate ?? defaultAcquisitionDate ?? "",
            )}
            className={fieldClass(fieldErrors, "acquisitionDate")}
            aria-invalid={invalid(fieldErrors, "acquisitionDate")}
          />
          <FieldError errors={fieldErrors} name="acquisitionDate" />
        </label>
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
            ? "Оновити екземпляр"
            : "Додати екземпляр"}
      </button>
    </form>
  );
}
