export const money = new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 });
export const date = new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" });
export const dateTime = new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" });
export const recordId = (value: unknown) => {
  if (value && typeof value === "object" && "table" in value && "id" in value) {
    const record = value as { table: unknown; id: unknown };
    return `${record.table}:${record.id}`;
  }
  return String(value).replace(/^([^:]+):⟨(.+)⟩$/, "$1:$2");
};

export const dictionaryLabels: Record<string, string> = {
  active: "Активне",
  inactive: "Неактивне",
  under_repair: "У ремонті",
  active_room: "Активне",
  in_storage: "На складі",
  in_repair: "У ремонті",
  lost: "Втрачено",
  found: "Знайдено",
  written_off: "Списано",
  archived: "В архіві",
  new: "Нове",
  good: "Справне",
  satisfactory: "Задовільне",
  needs_repair: "Потребує ремонту",
  damaged: "Пошкоджене",
  unusable: "Непридатне",
  received: "Надходження",
  assigned_to_room: "Призначено в приміщення",
  transferred: "Передано",
  returned_to_storage: "Повернено на склад",
  sent_to_repair: "Передано в ремонт",
  returned_from_repair: "Повернено з ремонту",
  corrected: "Скориговано",
  draft: "Чернетка",
  submitted: "Подано",
  approved: "Погоджено",
  rejected: "Відхилено",
  completed: "Завершено",
  cancelled: "Скасовано",
  reported: "Повідомлено",
  under_review: "На перевірці",
  repaired: "Відремонтовано",
  not_repairable: "Не підлягає ремонту",
  low: "Низька",
  medium: "Середня",
  high: "Висока",
  planned: "Заплановано",
  in_progress: "У роботі",
  pending: "Очікує перевірки",
  missing: "Відсутнє",
  misplaced: "Не з цієї аудиторії",
  unknown: "Невідомий номер",
  extra: "Зайве",
  moved: "Переміщено",
  proposed: "Запропоновано",
  system: "Системне повідомлення",
  transfer_request: "Заявка на передачу",
  equipment: "Обладнання",
  room: "Приміщення",
  audit: "Аудит",
  repair: "Ремонт",
  writeoff_request: "Заявка на списання",
  notification: "Сповіщення",
  equipment_created: "Створено обладнання",
  equipment_assigned: "Обладнання призначено",
  "equipment.created": "Створено обладнання",
  "equipment.updated": "Оновлено обладнання",
  "equipment.deleted": "Видалено обладнання",
  "room.deleted": "Видалено приміщення",
  "movement.created": "Створено рух обладнання",
  "repair.updated": "Оновлено ремонт",
  "audit.started": "Аудит розпочато",
  "audit.completed": "Аудит завершено",
  "audit.cancelled": "Аудит скасовано",
  "audit.deleted": "Аудит видалено",
  "audit.item_scanned": "Перевірено екземпляр",
  "audit.item_removed": "Прибрано екземпляр з аудиту",
  "transfer.completed": "Передачу завершено",
  staff: "Працівник",
  inventory_manager: "Менеджер обліку",
  admin: "Адміністратор",
};

export function label(value: unknown, fallback = "Запис") {
  const key = String(value ?? "");
  return dictionaryLabels[key] ?? (key.replaceAll("_", " ") || fallback);
}

export function formatDateTime(value: unknown) {
  const raw = String(value ?? "");
  if (!raw) return "Дата не вказана";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return dateTime.format(parsed);
}
