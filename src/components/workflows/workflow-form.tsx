"use client";

import { useActionState, useMemo, useState } from "react";
import { FieldError, FormFeedback, fieldClass, invalid, labelClass } from "@/components/ui/form-errors";
import { recordId } from "@/lib/format";
import {
  createAuditAction,
  createMovementAction,
  createRepairAction,
  createTransferRequestAction,
  createWriteoffAction,
  scanAuditItemAction,
  updateAuditAction,
  type WorkflowActionState,
} from "@/server/actions/workflows";

const initial: WorkflowActionState = {};

type EquipmentOption = { id: unknown; equipmentId?: string; equipmentName?: string; inventoryNumber: string; serialNumber?: string; currentRoomId: string; roomLabel?: string; condition?: string; status?: string };
type RoomOption = { id: unknown; number: string; name?: string };

const submit = (pending: boolean, text: string) => (
  <button className="primary-button" type="submit" disabled={pending}>{pending ? "Зберігаємо…" : text}</button>
);

const formKey = (values?: Record<string, string>) => JSON.stringify(values ?? {});
const valueOf = (state: WorkflowActionState, name: string, fallback = "") => state.values?.[name] ?? fallback;
const equipmentLabel = (item: EquipmentOption) => [item.equipmentName, item.inventoryNumber, item.serialNumber, item.roomLabel].filter(Boolean).join(" · ");

export function TransferRequestForm({ equipment, rooms }: { equipment: EquipmentOption[]; rooms: RoomOption[] }) {
  const [state, action, pending] = useActionState(createTransferRequestAction, initial);
  const fieldErrors = state.fieldErrors;

  return (
    <form key={formKey(state.values)} action={action} noValidate className="passport-form">
      <div className="form-grid">
        <label className={labelClass(fieldErrors, "equipmentId")}>
          Обладнання
          <select
            name="equipmentId"
            defaultValue={valueOf(state, "equipmentId")}
            className={fieldClass(fieldErrors, "equipmentId")}
            aria-invalid={invalid(fieldErrors, "equipmentId")}
          >
            <option value="" disabled>Оберіть обладнання</option>
            {equipment.map((item) => (
              <option key={recordId(item.id)} value={recordId(item.id)}>{equipmentLabel(item)}</option>
            ))}
          </select>
          <FieldError errors={fieldErrors} name="equipmentId" />
        </label>

        <label className={labelClass(fieldErrors, "fromRoomId")}>
          Звідки
          <select
            name="fromRoomId"
            defaultValue={valueOf(state, "fromRoomId")}
            className={fieldClass(fieldErrors, "fromRoomId")}
            aria-invalid={invalid(fieldErrors, "fromRoomId")}
          >
            <option value="" disabled>Оберіть приміщення</option>
            {rooms.map((room) => <option key={recordId(room.id)} value={recordId(room.id)}>{room.number}</option>)}
          </select>
          <FieldError errors={fieldErrors} name="fromRoomId" />
        </label>

        <label className={labelClass(fieldErrors, "toRoomId")}>
          Куди
          <select
            name="toRoomId"
            defaultValue={valueOf(state, "toRoomId")}
            className={fieldClass(fieldErrors, "toRoomId")}
            aria-invalid={invalid(fieldErrors, "toRoomId")}
          >
            <option value="" disabled>Оберіть приміщення</option>
            {rooms.map((room) => <option key={recordId(room.id)} value={recordId(room.id)}>{room.number}</option>)}
          </select>
          <FieldError errors={fieldErrors} name="toRoomId" />
        </label>

        <label className={labelClass(fieldErrors, "reason")}>
          Причина
          <textarea
            name="reason"
            rows={3}
            defaultValue={valueOf(state, "reason")}
            className={fieldClass(fieldErrors, "reason")}
            aria-invalid={invalid(fieldErrors, "reason")}
          />
          <FieldError errors={fieldErrors} name="reason" />
        </label>
      </div>

      <FormFeedback formError={state.formError} fieldErrors={fieldErrors} success={state.success} />
      {submit(pending, "Подати заявку")}
    </form>
  );
}

export function MovementForm({ equipment, rooms }: { equipment: EquipmentOption[]; rooms: RoomOption[] }) {
  const [state, action, pending] = useActionState(createMovementAction, initial);
  const fieldErrors = state.fieldErrors;

  return (
    <form key={formKey(state.values)} action={action} noValidate className="passport-form">
      <div className="form-grid">
        <label className={labelClass(fieldErrors, "equipmentId")}>
          Обладнання
          <select
            name="equipmentId"
            defaultValue={valueOf(state, "equipmentId")}
            className={fieldClass(fieldErrors, "equipmentId")}
            aria-invalid={invalid(fieldErrors, "equipmentId")}
          >
            <option value="" disabled>Оберіть обладнання</option>
            {equipment.map((item) => (
              <option key={recordId(item.id)} value={recordId(item.id)}>{equipmentLabel(item)}</option>
            ))}
          </select>
          <FieldError errors={fieldErrors} name="equipmentId" />
        </label>

        <label className={labelClass(fieldErrors, "movementType")}>
          Тип руху
          <select
            name="movementType"
            defaultValue={valueOf(state, "movementType", "transferred")}
            className={fieldClass(fieldErrors, "movementType")}
            aria-invalid={invalid(fieldErrors, "movementType")}
          >
            <option value="transferred">Передача між приміщеннями</option>
            <option value="returned_to_storage">Повернення на склад</option>
            <option value="sent_to_repair">Передача в ремонт</option>
            <option value="returned_from_repair">Повернення з ремонту</option>
            <option value="corrected">Коригування місця</option>
          </select>
          <FieldError errors={fieldErrors} name="movementType" />
        </label>

        <label className={labelClass(fieldErrors, "toRoomId")}>
          Куди перемістити
          <select
            name="toRoomId"
            defaultValue={valueOf(state, "toRoomId")}
            className={fieldClass(fieldErrors, "toRoomId")}
            aria-invalid={invalid(fieldErrors, "toRoomId")}
          >
            <option value="" disabled>Оберіть приміщення</option>
            {rooms.map((room) => (
              <option key={recordId(room.id)} value={recordId(room.id)}>{room.number}{room.name ? ` · ${room.name}` : ""}</option>
            ))}
          </select>
          <FieldError errors={fieldErrors} name="toRoomId" />
        </label>

        <label className={labelClass(fieldErrors, "reason")}>
          Підстава
          <textarea
            name="reason"
            rows={3}
            placeholder="Наприклад: підготовка лабораторії до практичного заняття"
            defaultValue={valueOf(state, "reason")}
            className={fieldClass(fieldErrors, "reason")}
            aria-invalid={invalid(fieldErrors, "reason")}
          />
          <FieldError errors={fieldErrors} name="reason" />
        </label>
      </div>

      <FormFeedback formError={state.formError} fieldErrors={fieldErrors} success={state.success} />
      {submit(pending, "Створити рух")}
    </form>
  );
}

export function RepairForm({ equipment, rooms }: { equipment: EquipmentOption[]; rooms: RoomOption[] }) {
  const [state, action, pending] = useActionState(createRepairAction, initial);
  const fieldErrors = state.fieldErrors;

  return (
    <form key={formKey(state.values)} action={action} noValidate className="passport-form">
      <div className="form-grid">
        <label className={labelClass(fieldErrors, "equipmentId")}>
          Обладнання
          <select
            name="equipmentId"
            defaultValue={valueOf(state, "equipmentId")}
            className={fieldClass(fieldErrors, "equipmentId")}
            aria-invalid={invalid(fieldErrors, "equipmentId")}
          >
            <option value="" disabled>Оберіть обладнання</option>
            {equipment.map((item) => <option key={recordId(item.id)} value={recordId(item.id)}>{equipmentLabel(item)}</option>)}
          </select>
          <FieldError errors={fieldErrors} name="equipmentId" />
        </label>

        <label className={labelClass(fieldErrors, "roomId")}>
          Приміщення
          <select
            name="roomId"
            defaultValue={valueOf(state, "roomId")}
            className={fieldClass(fieldErrors, "roomId")}
            aria-invalid={invalid(fieldErrors, "roomId")}
          >
            <option value="" disabled>Оберіть приміщення</option>
            {rooms.map((room) => <option key={recordId(room.id)} value={recordId(room.id)}>{room.number}</option>)}
          </select>
          <FieldError errors={fieldErrors} name="roomId" />
        </label>

        <label className={labelClass(fieldErrors, "severity")}>
          Серйозність
          <select
            name="severity"
            defaultValue={valueOf(state, "severity", "medium")}
            className={fieldClass(fieldErrors, "severity")}
            aria-invalid={invalid(fieldErrors, "severity")}
          >
            <option value="low">Низька</option>
            <option value="medium">Середня</option>
            <option value="high">Висока</option>
          </select>
          <FieldError errors={fieldErrors} name="severity" />
        </label>

        <label className={labelClass(fieldErrors, "issueDescription")}>
          Опис несправності
          <textarea
            name="issueDescription"
            rows={3}
            defaultValue={valueOf(state, "issueDescription")}
            className={fieldClass(fieldErrors, "issueDescription")}
            aria-invalid={invalid(fieldErrors, "issueDescription")}
          />
          <FieldError errors={fieldErrors} name="issueDescription" />
        </label>
      </div>

      <FormFeedback formError={state.formError} fieldErrors={fieldErrors} success={state.success} />
      {submit(pending, "Повідомити про несправність")}
    </form>
  );
}

type AuditFormData = {
  id?: unknown;
  title?: string;
  roomId?: string;
  plannedDate?: string;
  auditScope?: string;
  expectedItemCount?: number;
  auditNote?: string;
};

export function AuditForm({ rooms, audit, mode = "create" }: { rooms: RoomOption[]; audit?: AuditFormData; mode?: "create" | "edit" }) {
  const [state, action, pending] = useActionState(mode === "edit" ? updateAuditAction : createAuditAction, initial);
  const fieldErrors = state.fieldErrors;

  return (
    <form key={formKey(state.values)} action={action} noValidate className="passport-form">
      {mode === "edit" && <input type="hidden" name="auditId" value={recordId(audit?.id ?? "")} />}
      <div className="form-grid">
        <label className={labelClass(fieldErrors, "title")}>
          Назва
          <input
            name="title"
            defaultValue={valueOf(state, "title", audit?.title ?? "")}
            className={fieldClass(fieldErrors, "title")}
            aria-invalid={invalid(fieldErrors, "title")}
          />
          <FieldError errors={fieldErrors} name="title" />
        </label>

        <label className={labelClass(fieldErrors, "roomId")}>
          Приміщення
          <select
            name="roomId"
            defaultValue={valueOf(state, "roomId", audit?.roomId ?? "")}
            className={fieldClass(fieldErrors, "roomId")}
            aria-invalid={invalid(fieldErrors, "roomId")}
          >
            <option value="" disabled>Оберіть приміщення</option>
            {rooms.map((room) => <option key={recordId(room.id)} value={recordId(room.id)}>{room.number}</option>)}
          </select>
          <FieldError errors={fieldErrors} name="roomId" />
        </label>

        <label className={labelClass(fieldErrors, "plannedDate")}>
          Запланована дата
          <input
            name="plannedDate"
            type="date"
            defaultValue={valueOf(state, "plannedDate", audit?.plannedDate ? String(audit.plannedDate).slice(0, 10) : "")}
            className={fieldClass(fieldErrors, "plannedDate")}
            aria-invalid={invalid(fieldErrors, "plannedDate")}
          />
          <FieldError errors={fieldErrors} name="plannedDate" />
        </label>

        <label className={labelClass(fieldErrors, "expectedItemCount")}>
          Очікувана кількість позицій
          <input
            name="expectedItemCount"
            type="number"
            min="0"
            inputMode="numeric"
            defaultValue={valueOf(state, "expectedItemCount", audit?.expectedItemCount != null ? String(audit.expectedItemCount) : "")}
            className={fieldClass(fieldErrors, "expectedItemCount")}
            aria-invalid={invalid(fieldErrors, "expectedItemCount")}
          />
          <FieldError errors={fieldErrors} name="expectedItemCount" />
        </label>

        <label className={labelClass(fieldErrors, "auditScope")}>
          Перелік або обсяг перевірки
          <textarea
            name="auditScope"
            rows={3}
            placeholder="Наприклад: ПК викладача, 12 учнівських станцій, монітори, мережевий комутатор, документи та кабелі."
            defaultValue={valueOf(state, "auditScope", audit?.auditScope ?? "")}
            className={fieldClass(fieldErrors, "auditScope")}
            aria-invalid={invalid(fieldErrors, "auditScope")}
          />
          <FieldError errors={fieldErrors} name="auditScope" />
        </label>

        <label className={labelClass(fieldErrors, "auditNote")}>
          Примітка для перевірки
          <textarea
            name="auditNote"
            rows={3}
            placeholder="Необов’язково: що перевірити окремо, хто має бути присутній, на що звернути увагу."
            defaultValue={valueOf(state, "auditNote", audit?.auditNote ?? "")}
            className={fieldClass(fieldErrors, "auditNote")}
            aria-invalid={invalid(fieldErrors, "auditNote")}
          />
          <FieldError errors={fieldErrors} name="auditNote" />
        </label>
      </div>

      <FormFeedback formError={state.formError} fieldErrors={fieldErrors} success={state.success} />
      {submit(pending, mode === "edit" ? "Оновити аудит" : "Створити аудит")}
    </form>
  );
}

export function AuditScanForm({ auditId, auditRoomId, equipment }: { auditId: unknown; auditRoomId?: string; equipment: EquipmentOption[] }) {
  const [state, action, pending] = useActionState(scanAuditItemAction, initial);
  const fieldErrors = state.fieldErrors;
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(valueOf(state, "equipmentId"));
  const activeId = selectedId;
  const normalizedAuditRoom = auditRoomId ? recordId(auditRoomId) : "";
  const selected = useMemo(() => equipment.find((item) => recordId(item.id) === activeId), [activeId, equipment]);
  const filteredEquipment = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = needle
      ? equipment.filter((item) => equipmentLabel(item).toLowerCase().includes(needle))
      : equipment;
    return rows
      .slice()
      .sort((left, right) => {
        const leftSameRoom = normalizedAuditRoom && recordId(left.currentRoomId) === normalizedAuditRoom ? 0 : 1;
        const rightSameRoom = normalizedAuditRoom && recordId(right.currentRoomId) === normalizedAuditRoom ? 0 : 1;
        return leftSameRoom - rightSameRoom || equipmentLabel(left).localeCompare(equipmentLabel(right), "uk");
      })
      .slice(0, 18);
  }, [equipment, normalizedAuditRoom, query]);

  return (
    <form key={formKey(state.values)} action={action} noValidate className="passport-form audit-scan-form">
      <input type="hidden" name="auditId" value={recordId(auditId)} />
      <input type="hidden" name="equipmentId" value={activeId} />

      <div className="audit-search-panel">
        <div className="audit-search-copy">
          <strong>Знайдений екземпляр</strong>
          <span>Виберіть конкретну фізичну одиницю або введіть серійний / інвентарний номер вручну.</span>
          <small>{filteredEquipment.length} результатів із {equipment.length} екземплярів у реєстрі</small>
        </div>
        <label className={labelClass(fieldErrors, "equipmentId")}>
          Пошук у реєстрі
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={fieldClass(fieldErrors, "equipmentId")}
            placeholder="Назва, ДМТФК-00001, DMTC-2026-01-001 або аудиторія"
            aria-invalid={invalid(fieldErrors, "equipmentId")}
          />
          <FieldError errors={fieldErrors} name="equipmentId" />
        </label>
      </div>

      {selected && (
        <div className="audit-selected-equipment">
          <span>Обрано</span>
          <strong>{selected.equipmentName}</strong>
          <code>{selected.inventoryNumber} · {selected.serialNumber}</code>
          <small>{selected.roomLabel || "Приміщення не вказано"}</small>
          <button type="button" onClick={() => setSelectedId("")}>Очистити вибір</button>
        </div>
      )}

      <div className="audit-equipment-picker" role="listbox" aria-label="Результати пошуку екземплярів">
        {filteredEquipment.map((item) => {
          const id = recordId(item.id);
          const sameRoom = normalizedAuditRoom && recordId(item.currentRoomId) === normalizedAuditRoom;
          const isActive = id === activeId;
          return (
            <button
              key={id}
              type="button"
              className={`audit-equipment-option${isActive ? " audit-equipment-option-active" : ""}`}
              onClick={() => setSelectedId(id)}
              role="option"
              aria-selected={isActive}
            >
              <span className="audit-equipment-main">
                <strong>{item.equipmentName}</strong>
                <small>{item.inventoryNumber} · {item.serialNumber}</small>
              </span>
              <span className="audit-equipment-room">
                {item.roomLabel || "Приміщення не вказано"}
              </span>
              <span className={`audit-room-marker ${sameRoom ? "audit-room-marker-ok" : "audit-room-marker-warn"}`}>
                {sameRoom ? "у цій аудиторії" : "інше приміщення"}
              </span>
            </button>
          );
        })}
        {filteredEquipment.length === 0 && <p className="audit-search-empty">За цим запитом екземпляр не знайдено. Можна внести номер вручну нижче.</p>}
      </div>

      <div className="form-grid audit-scan-fields">
        <label className={labelClass(fieldErrors, "code")}>
          Ручне введення, якщо екземпляра немає у списку
          <input
            name="code"
            placeholder="DMTC-2026-0001 або ДМТФК-0001"
            defaultValue={valueOf(state, "code")}
            className={fieldClass(fieldErrors, "code")}
            aria-invalid={invalid(fieldErrors, "code")}
          />
          <FieldError errors={fieldErrors} name="code" />
        </label>

        <label className={labelClass(fieldErrors, "actualCondition")}>
          Фактичний стан
          <select
            name="actualCondition"
            defaultValue={valueOf(state, "actualCondition", "good")}
            className={fieldClass(fieldErrors, "actualCondition")}
            aria-invalid={invalid(fieldErrors, "actualCondition")}
          >
            <option value="good">Справне</option>
            <option value="satisfactory">Задовільне</option>
            <option value="needs_repair">Потребує ремонту</option>
            <option value="damaged">Пошкоджене</option>
            <option value="unusable">Непридатне</option>
          </select>
          <FieldError errors={fieldErrors} name="actualCondition" />
        </label>

        <label className={labelClass(fieldErrors, "note")}>
          Примітка
          <textarea
            name="note"
            rows={3}
            placeholder="Необов’язково: де знайдено, комплектність, видиме пошкодження."
            defaultValue={valueOf(state, "note")}
            className={fieldClass(fieldErrors, "note")}
            aria-invalid={invalid(fieldErrors, "note")}
          />
          <FieldError errors={fieldErrors} name="note" />
        </label>
      </div>

      <FormFeedback formError={state.formError} fieldErrors={fieldErrors} success={state.success} />
      {submit(pending, "Внести екземпляр")}
    </form>
  );
}

export function WriteoffForm({ equipment }: { equipment: EquipmentOption[] }) {
  const [state, action, pending] = useActionState(createWriteoffAction, initial);
  const fieldErrors = state.fieldErrors;

  return (
    <form key={formKey(state.values)} action={action} noValidate className="passport-form">
      <div className="form-grid">
        <label className={labelClass(fieldErrors, "equipmentId")}>
          Обладнання
          <select
            name="equipmentId"
            defaultValue={valueOf(state, "equipmentId")}
            className={fieldClass(fieldErrors, "equipmentId")}
            aria-invalid={invalid(fieldErrors, "equipmentId")}
          >
            <option value="" disabled>Оберіть обладнання</option>
            {equipment.map((item) => (
              <option key={recordId(item.id)} value={recordId(item.id)}>{equipmentLabel(item)}</option>
            ))}
          </select>
          <FieldError errors={fieldErrors} name="equipmentId" />
        </label>

        <label className={labelClass(fieldErrors, "reason")}>
          Причина
          <textarea
            name="reason"
            rows={3}
            defaultValue={valueOf(state, "reason")}
            className={fieldClass(fieldErrors, "reason")}
            aria-invalid={invalid(fieldErrors, "reason")}
          />
          <FieldError errors={fieldErrors} name="reason" />
        </label>
      </div>

      <FormFeedback formError={state.formError} fieldErrors={fieldErrors} success={state.success} />
      {submit(pending, "Подати на списання")}
    </form>
  );
}
