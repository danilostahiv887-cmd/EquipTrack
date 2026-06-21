"use client";

import { useActionState } from "react";
import { FieldError, FormFeedback, fieldClass, invalid, labelClass } from "@/components/ui/form-errors";
import { recordId } from "@/lib/format";
import { createRoomAction, updateRoomAction, type RoomActionState } from "@/server/actions/rooms";

const initial: RoomActionState = {};
const formKey = (values?: Record<string, string>) => JSON.stringify(values ?? {});
const valueOf = (state: RoomActionState, name: string, fallback: string | number = "") => state.values?.[name] ?? fallback;

type RoomFormData = {
  id?: unknown;
  number?: string;
  name?: string;
  buildingId?: string;
  roomTypeId?: string;
  responsibleId?: string;
  floor?: number;
  capacity?: number;
  status?: string;
  description?: string;
};

export function RoomForm({
  buildings,
  types,
  users,
  room,
  mode = "create",
}: {
  buildings: Array<{ id: unknown; name: string }>;
  types: Array<{ id: unknown; name: string }>;
  users: Array<{ id: unknown; fullName?: string }>;
  room?: RoomFormData;
  mode?: "create" | "edit";
}) {
  const [state, action, pending] = useActionState(mode === "edit" ? updateRoomAction : createRoomAction, initial);
  const fieldErrors = state.fieldErrors;

  return (
    <form key={formKey(state.values)} noValidate action={action} className="passport-form">
      {mode === "edit" && <input type="hidden" name="roomId" value={recordId(room?.id ?? "")} />}

      <div className="form-grid">
        <label className={labelClass(fieldErrors, "number")}>
          Номер
          <input
            name="number"
            defaultValue={valueOf(state, "number", room?.number ?? "")}
            className={fieldClass(fieldErrors, "number")}
            aria-invalid={invalid(fieldErrors, "number")}
          />
          <FieldError errors={fieldErrors} name="number" />
        </label>

        <label className={labelClass(fieldErrors, "name")}>
          Назва
          <input
            name="name"
            defaultValue={valueOf(state, "name", room?.name ?? "")}
            className={fieldClass(fieldErrors, "name")}
            aria-invalid={invalid(fieldErrors, "name")}
          />
          <FieldError errors={fieldErrors} name="name" />
        </label>

        <label className={labelClass(fieldErrors, "buildingId")}>
          Корпус
          <select
            name="buildingId"
            defaultValue={valueOf(state, "buildingId", room?.buildingId ?? "")}
            className={fieldClass(fieldErrors, "buildingId")}
            aria-invalid={invalid(fieldErrors, "buildingId")}
          >
            <option value="" disabled>Оберіть корпус</option>
            {buildings.map((entry) => <option key={recordId(entry.id)} value={recordId(entry.id)}>{entry.name}</option>)}
          </select>
          <FieldError errors={fieldErrors} name="buildingId" />
        </label>

        <label className={labelClass(fieldErrors, "roomTypeId")}>
          Тип
          <select
            name="roomTypeId"
            defaultValue={valueOf(state, "roomTypeId", room?.roomTypeId ?? "")}
            className={fieldClass(fieldErrors, "roomTypeId")}
            aria-invalid={invalid(fieldErrors, "roomTypeId")}
          >
            <option value="" disabled>Оберіть тип</option>
            {types.map((entry) => <option key={recordId(entry.id)} value={recordId(entry.id)}>{entry.name}</option>)}
          </select>
          <FieldError errors={fieldErrors} name="roomTypeId" />
        </label>

        <label className={labelClass(fieldErrors, "responsibleId")}>
          Відповідальна особа
          <select
            name="responsibleId"
            defaultValue={valueOf(state, "responsibleId", room?.responsibleId ?? "")}
            className={fieldClass(fieldErrors, "responsibleId")}
            aria-invalid={invalid(fieldErrors, "responsibleId")}
          >
            <option value="">Не призначено</option>
            {users.map((entry) => <option key={recordId(entry.id)} value={recordId(entry.id)}>{entry.fullName}</option>)}
          </select>
          <FieldError errors={fieldErrors} name="responsibleId" />
        </label>

        <label className={labelClass(fieldErrors, "floor")}>
          Поверх
          <input
            name="floor"
            inputMode="numeric"
            defaultValue={valueOf(state, "floor", room?.floor ?? 1)}
            className={fieldClass(fieldErrors, "floor")}
            aria-invalid={invalid(fieldErrors, "floor")}
          />
          <FieldError errors={fieldErrors} name="floor" />
        </label>

        <label className={labelClass(fieldErrors, "capacity")}>
          Місткість
          <input
            name="capacity"
            inputMode="numeric"
            defaultValue={valueOf(state, "capacity", room?.capacity ?? 20)}
            className={fieldClass(fieldErrors, "capacity")}
            aria-invalid={invalid(fieldErrors, "capacity")}
          />
          <FieldError errors={fieldErrors} name="capacity" />
        </label>

        <label className={labelClass(fieldErrors, "status")}>
          Стан
          <select
            name="status"
            defaultValue={valueOf(state, "status", room?.status ?? "active")}
            className={fieldClass(fieldErrors, "status")}
            aria-invalid={invalid(fieldErrors, "status")}
          >
            <option value="active">Активне</option>
            <option value="inactive">Неактивне</option>
            <option value="under_repair">У ремонті</option>
          </select>
          <FieldError errors={fieldErrors} name="status" />
        </label>

        <label className={labelClass(fieldErrors, "description", "wide-field")}>
          Опис
          <textarea
            name="description"
            rows={3}
            defaultValue={valueOf(state, "description", room?.description ?? "")}
            className={fieldClass(fieldErrors, "description")}
            aria-invalid={invalid(fieldErrors, "description")}
          />
          <FieldError errors={fieldErrors} name="description" />
        </label>
      </div>

      <FormFeedback formError={state.formError} fieldErrors={fieldErrors} />
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Зберігаємо…" : mode === "edit" ? "Зберегти зміни" : "Створити приміщення"}
      </button>
    </form>
  );
}
