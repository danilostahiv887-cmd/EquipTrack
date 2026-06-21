import { ConditionChart } from "@/components/analytics/condition-chart";
import { getAnalytics } from "@/server/services/workflows";
import { requirePermission } from "@/lib/auth/guards";
import { recordId } from "@/lib/format";

export default async function AnalyticsPage() { await requirePermission("analytics:read"); const data = await getAnalytics(); return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">ОЦІНКА ФОНДУ</p><h1>Аналітика</h1><p>Розподіл технічного стану, категорій і пріоритетів інвентарного фонду.</p></div></header><section className="analysis-block"><h2>Стан обладнання</h2><ConditionChart rows={data.condition.map((row) => ({ label: row.condition, value: Number(row.total) }))}/></section><section className="analysis-block"><h2>Обладнання найвищої вартості</h2><div className="workflow-list">{data.highValue.map((row) => <article key={recordId(row.id)}><strong>{String(row.name)}</strong><span>{String(row["inventoryNumber"] ?? "")}</span></article>)}</div></section></section>; }
