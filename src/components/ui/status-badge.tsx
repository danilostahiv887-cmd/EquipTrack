const labels: Record<string, string> = { active: "Активне", good: "Справне", satisfactory: "Задовільне", needs_repair: "Потребує ремонту", damaged: "Пошкоджене", unusable: "Непридатне", in_repair: "У ремонті", written_off: "Списане", archived: "Архівне", submitted: "Подано", approved: "Погоджено", rejected: "Відхилено", completed: "Завершено", planned: "Заплановано", in_progress: "У роботі", active_room: "Активне", inactive: "Неактивне" };

export function StatusBadge({ status }: { status: string }) {
  const tone = status.includes("repair") || status === "damaged" ? "warning" : status.includes("written") || status === "rejected" ? "danger" : status === "good" || status === "active" || status === "approved" || status === "completed" ? "success" : "neutral";
  return <span className={`status-badge status-${tone}`}>{labels[status] ?? status}</span>;
}
