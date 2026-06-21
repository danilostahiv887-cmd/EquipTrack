"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  FieldError,
  FormFeedback,
  fieldClass,
  invalid,
  labelClass,
} from "@/components/ui/form-errors";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { formatDateTime, label, recordId } from "@/lib/format";
import {
  createAuditAction,
  createMovementAction,
  createRepairAction,
  createTransferRequestAction,
  createWriteoffAction,
  deleteAuditItemAction,
  scanAuditItemAction,
  updateAuditAction,
  type WorkflowActionState,
} from "@/server/actions/workflows";

const initial: WorkflowActionState = {};

export type EquipmentOption = {
  id: unknown;
  equipmentId?: string;
  equipmentName?: string;
  inventoryNumber: string;
  serialNumber?: string;
  currentRoomId: string;
  roomLabel?: string;
  condition?: string;
  status?: string;
};
export type RoomOption = { id: unknown; number: string; name?: string };
export type AuditItemOption = {
  id: unknown;
  auditId?: string;
  equipmentId?: string;
  scannedCode?: string;
  resultStatus?: string;
  actualCondition?: string;
  note?: string;
  checkedAt?: string;
  expectedRoomId?: string;
  actualRoomId?: string;
  expectedSerialNumber?: string;
  expectedInventoryNumber?: string;
};

const submit = (pending: boolean, text: string) => (
  <button className="primary-button" type="submit" disabled={pending}>
    {pending ? "Зберігаємо…" : text}
  </button>
);

const formKey = (values?: Record<string, string>) =>
  JSON.stringify(values ?? {});
const valueOf = (state: WorkflowActionState, name: string, fallback = "") =>
  state.values?.[name] ?? fallback;
const equipmentLabel = (item: EquipmentOption) =>
  [item.equipmentName, item.inventoryNumber, item.serialNumber, item.roomLabel]
    .filter(Boolean)
    .join(" · ");
const isCheckedAuditItem = (item: AuditItemOption) =>
  Boolean(item.resultStatus && item.resultStatus !== "pending");

export function TransferRequestForm({
  equipment,
  rooms,
}: {
  equipment: EquipmentOption[];
  rooms: RoomOption[];
}) {
  const [state, action, pending] = useActionState(
    createTransferRequestAction,
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
      <div className="form-grid">
        <label className={labelClass(fieldErrors, "equipmentId")}>
          Обладнання
          <select
            name="equipmentId"
            defaultValue={valueOf(state, "equipmentId")}
            className={fieldClass(fieldErrors, "equipmentId")}
            aria-invalid={invalid(fieldErrors, "equipmentId")}
          >
            <option value="" disabled>
              Оберіть обладнання
            </option>
            {equipment.map((item) => (
              <option key={recordId(item.id)} value={recordId(item.id)}>
                {equipmentLabel(item)}
              </option>
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
            <option value="" disabled>
              Оберіть приміщення
            </option>
            {rooms.map((room) => (
              <option key={recordId(room.id)} value={recordId(room.id)}>
                {room.number}
              </option>
            ))}
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
            <option value="" disabled>
              Оберіть приміщення
            </option>
            {rooms.map((room) => (
              <option key={recordId(room.id)} value={recordId(room.id)}>
                {room.number}
              </option>
            ))}
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

      <FormFeedback
        formError={state.formError}
        fieldErrors={fieldErrors}
        success={state.success}
      />
      {submit(pending, "Подати заявку")}
    </form>
  );
}

export function MovementForm({
  equipment,
  rooms,
}: {
  equipment: EquipmentOption[];
  rooms: RoomOption[];
}) {
  const [state, action, pending] = useActionState(
    createMovementAction,
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
      <div className="form-grid">
        <label className={labelClass(fieldErrors, "equipmentId")}>
          Обладнання
          <select
            name="equipmentId"
            defaultValue={valueOf(state, "equipmentId")}
            className={fieldClass(fieldErrors, "equipmentId")}
            aria-invalid={invalid(fieldErrors, "equipmentId")}
          >
            <option value="" disabled>
              Оберіть обладнання
            </option>
            {equipment.map((item) => (
              <option key={recordId(item.id)} value={recordId(item.id)}>
                {equipmentLabel(item)}
              </option>
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
            <option value="" disabled>
              Оберіть приміщення
            </option>
            {rooms.map((room) => (
              <option key={recordId(room.id)} value={recordId(room.id)}>
                {room.number}
                {room.name ? ` · ${room.name}` : ""}
              </option>
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

      <FormFeedback
        formError={state.formError}
        fieldErrors={fieldErrors}
        success={state.success}
      />
      {submit(pending, "Створити рух")}
    </form>
  );
}

export function RepairForm({
  equipment,
  rooms,
}: {
  equipment: EquipmentOption[];
  rooms: RoomOption[];
}) {
  const [state, action, pending] = useActionState(createRepairAction, initial);
  const fieldErrors = state.fieldErrors;

  return (
    <form
      key={formKey(state.values)}
      action={action}
      noValidate
      className="passport-form"
    >
      <div className="form-grid">
        <label className={labelClass(fieldErrors, "equipmentId")}>
          Обладнання
          <select
            name="equipmentId"
            defaultValue={valueOf(state, "equipmentId")}
            className={fieldClass(fieldErrors, "equipmentId")}
            aria-invalid={invalid(fieldErrors, "equipmentId")}
          >
            <option value="" disabled>
              Оберіть обладнання
            </option>
            {equipment.map((item) => (
              <option key={recordId(item.id)} value={recordId(item.id)}>
                {equipmentLabel(item)}
              </option>
            ))}
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
            <option value="" disabled>
              Оберіть приміщення
            </option>
            {rooms.map((room) => (
              <option key={recordId(room.id)} value={recordId(room.id)}>
                {room.number}
              </option>
            ))}
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

      <FormFeedback
        formError={state.formError}
        fieldErrors={fieldErrors}
        success={state.success}
      />
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

export function AuditForm({
  rooms,
  audit,
  mode = "create",
}: {
  rooms: RoomOption[];
  audit?: AuditFormData;
  mode?: "create" | "edit";
}) {
  const [state, action, pending] = useActionState(
    mode === "edit" ? updateAuditAction : createAuditAction,
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
        <input type="hidden" name="auditId" value={recordId(audit?.id ?? "")} />
      )}
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
            <option value="" disabled>
              Оберіть приміщення
            </option>
            {rooms.map((room) => (
              <option key={recordId(room.id)} value={recordId(room.id)}>
                {room.number}
              </option>
            ))}
          </select>
          <FieldError errors={fieldErrors} name="roomId" />
        </label>

        <label className={labelClass(fieldErrors, "plannedDate")}>
          Запланована дата
          <input
            name="plannedDate"
            type="date"
            defaultValue={valueOf(
              state,
              "plannedDate",
              audit?.plannedDate ? String(audit.plannedDate).slice(0, 10) : "",
            )}
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
            defaultValue={valueOf(
              state,
              "expectedItemCount",
              audit?.expectedItemCount != null
                ? String(audit.expectedItemCount)
                : "",
            )}
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

      <FormFeedback
        formError={state.formError}
        fieldErrors={fieldErrors}
        success={state.success}
      />
      {submit(pending, mode === "edit" ? "Оновити аудит" : "Створити аудит")}
    </form>
  );
}

export function AuditScanForm({
  auditId,
  auditRoomId,
  equipment,
  auditItems,
}: {
  auditId: unknown;
  auditRoomId?: string;
  equipment: EquipmentOption[];
  auditItems: AuditItemOption[];
}) {
  const [state, action, pending] = useActionState(scanAuditItemAction, initial);
  const fieldErrors = state.fieldErrors;
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    if (state.success) {
      setSelectedIds([]);
      setQuery("");
    }
  }, [state.success]);
  const normalizedAuditRoom = auditRoomId ? recordId(auditRoomId) : "";
  const auditIdText = recordId(auditId);
  const equipmentById = useMemo(
    () => new Map(equipment.map((item) => [recordId(item.id), item])),
    [equipment],
  );
  const checkedItems = useMemo(
    () => auditItems.filter(isCheckedAuditItem),
    [auditItems],
  );
  const checkedEquipmentIds = useMemo(
    () =>
      new Set(
        checkedItems
          .map((item) => (item.equipmentId ? recordId(item.equipmentId) : ""))
          .filter(Boolean),
      ),
    [checkedItems],
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const availableEquipment = useMemo(
    () =>
      equipment.filter(
        (item) =>
          !checkedEquipmentIds.has(recordId(item.id)) ||
          selectedIdSet.has(recordId(item.id)),
      ),
    [checkedEquipmentIds, equipment, selectedIdSet],
  );
  const selectedEquipment = useMemo(
    () =>
      selectedIds
        .map((id) => equipmentById.get(id))
        .filter((item): item is EquipmentOption => Boolean(item)),
    [equipmentById, selectedIds],
  );
  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };
  const filteredEquipment = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = needle
      ? availableEquipment.filter((item) =>
          equipmentLabel(item).toLowerCase().includes(needle),
        )
      : availableEquipment;
    return rows
      .slice()
      .sort((left, right) => {
        const leftSameRoom =
          normalizedAuditRoom &&
          recordId(left.currentRoomId) === normalizedAuditRoom
            ? 0
            : 1;
        const rightSameRoom =
          normalizedAuditRoom &&
          recordId(right.currentRoomId) === normalizedAuditRoom
            ? 0
            : 1;
        return (
          leftSameRoom - rightSameRoom ||
          equipmentLabel(left).localeCompare(equipmentLabel(right), "uk")
        );
      })
      .slice(0, 18);
  }, [availableEquipment, normalizedAuditRoom, query]);

  return (
    <div className="audit-scan-stack">
      <section
        className="audit-checked-panel"
        aria-label="Вже внесені екземпляри аудиту"
      >
        <div className="audit-checked-heading">
          <div>
            <strong>Уже внесено</strong>
            <span>
              {checkedItems.length
                ? `${checkedItems.length} позицій не показуються у пошуку повторно.`
                : "Після внесення екземпляри з’являться тут."}
            </span>
          </div>
          <small>{auditItems.length} рядків у відомості аудиту</small>
        </div>
        <div className="audit-checked-list">
          {checkedItems.map((item) => {
            const itemId = recordId(item.id);
            const equipmentItem = item.equipmentId
              ? equipmentById.get(recordId(item.equipmentId))
              : undefined;
            const title =
              equipmentItem?.equipmentName ??
              item.scannedCode ??
              "Невідомий номер";
            const numbers = equipmentItem
              ? `${equipmentItem.inventoryNumber} · ${equipmentItem.serialNumber}`
              : (item.scannedCode ?? "Номер не вказано");
            return (
              <article key={itemId} className="audit-checked-item">
                <div>
                  <strong>{title}</strong>
                  <span>{numbers}</span>
                  <small>
                    {[
                      equipmentItem?.roomLabel,
                      item.resultStatus && label(item.resultStatus),
                      item.actualCondition && label(item.actualCondition),
                      item.checkedAt && formatDateTime(item.checkedAt),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                  {item.note && <em>{item.note}</em>}
                </div>
                <form action={deleteAuditItemAction}>
                  <input type="hidden" name="auditId" value={auditIdText} />
                  <input type="hidden" name="auditItemId" value={itemId} />
                  <ConfirmSubmit
                    label="Прибрати"
                    title="Прибрати екземпляр з аудиту?"
                    description="Якщо це очікуване обладнання аудиторії, рядок повернеться у стан «Очікує перевірки». Якщо це зайвий або невідомий номер — запис буде видалено з відомості."
                    confirmLabel="Прибрати"
                    tone="danger"
                  />
                </form>
              </article>
            );
          })}
          {checkedItems.length === 0 && <p>Внесених екземплярів ще немає.</p>}
        </div>
      </section>

      <form
        key={formKey(state.values)}
        action={action}
        noValidate
        className="passport-form audit-scan-form"
      >
        <input type="hidden" name="auditId" value={auditIdText} />
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="equipmentIds" value={id} />
        ))}

        <div className="audit-search-panel">
          <div className="audit-search-copy">
            <strong>Знайдений екземпляр</strong>
            <span>
              Виберіть конкретну фізичну одиницю або введіть серійний /
              інвентарний номер вручну.
            </span>
            <small>
              {filteredEquipment.length} результатів із{" "}
              {availableEquipment.length} доступних; {checkedItems.length} уже
              внесено
            </small>
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

        {selectedEquipment.length > 0 && (
          <div className="audit-selected-equipment">
            <span>Обрано {selectedEquipment.length}</span>
            <strong>
              {selectedEquipment
                .slice(0, 3)
                .map((item) => item.equipmentName)
                .join("; ")}
              {selectedEquipment.length > 3 ? "…" : ""}
            </strong>
            <code>
              {selectedEquipment
                .slice(0, 4)
                .map((item) => item.inventoryNumber)
                .join("; ")}
            </code>
            <small>
              {selectedEquipment.some(
                (item) =>
                  normalizedAuditRoom &&
                  recordId(item.currentRoomId) !== normalizedAuditRoom,
              )
                ? "У виборі є екземпляри з інших приміщень"
                : "Усі вибрані закріплені за цією аудиторією"}
            </small>
            <button type="button" onClick={() => setSelectedIds([])}>
              Очистити вибір
            </button>
          </div>
        )}

        <div
          className="audit-equipment-picker"
          role="listbox"
          aria-label="Результати пошуку екземплярів"
        >
          {filteredEquipment.map((item) => {
            const id = recordId(item.id);
            const sameRoom =
              normalizedAuditRoom &&
              recordId(item.currentRoomId) === normalizedAuditRoom;
            const isActive = selectedIdSet.has(id);
            return (
              <button
                key={id}
                type="button"
                className={`audit-equipment-option${isActive ? " audit-equipment-option-active" : ""}`}
                onClick={() => toggleSelected(id)}
                role="option"
                aria-selected={isActive}
              >
                <span className="audit-equipment-check" aria-hidden="true">
                  {isActive ? "✓" : "+"}
                </span>
                <span className="audit-equipment-main">
                  <strong>{item.equipmentName}</strong>
                  <small>
                    {item.inventoryNumber} · {item.serialNumber}
                  </small>
                </span>
                <span className="audit-equipment-room">
                  {item.roomLabel || "Приміщення не вказано"}
                </span>
                <span
                  className={`audit-room-marker ${sameRoom ? "audit-room-marker-ok" : "audit-room-marker-warn"}`}
                >
                  {sameRoom ? "у цій аудиторії" : "інше приміщення"}
                </span>
              </button>
            );
          })}
          {filteredEquipment.length === 0 && (
            <p className="audit-search-empty">
              За цим запитом екземпляр не знайдено або всі знайдені позиції вже
              внесені. Можна внести номер вручну нижче.
            </p>
          )}
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

        <FormFeedback
          formError={state.formError}
          fieldErrors={fieldErrors}
          success={state.success}
        />
        {submit(
          pending,
          selectedEquipment.length > 1
            ? `Внести ${selectedEquipment.length} екземпляри`
            : "Внести екземпляр",
        )}
      </form>
    </div>
  );
}

export function WriteoffForm({ equipment }: { equipment: EquipmentOption[] }) {
  const [state, action, pending] = useActionState(
    createWriteoffAction,
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
      <div className="form-grid">
        <label className={labelClass(fieldErrors, "equipmentId")}>
          Обладнання
          <select
            name="equipmentId"
            defaultValue={valueOf(state, "equipmentId")}
            className={fieldClass(fieldErrors, "equipmentId")}
            aria-invalid={invalid(fieldErrors, "equipmentId")}
          >
            <option value="" disabled>
              Оберіть обладнання
            </option>
            {equipment.map((item) => (
              <option key={recordId(item.id)} value={recordId(item.id)}>
                {equipmentLabel(item)}
              </option>
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

      <FormFeedback
        formError={state.formError}
        fieldErrors={fieldErrors}
        success={state.success}
      />
      {submit(pending, "Подати на списання")}
    </form>
  );
}
