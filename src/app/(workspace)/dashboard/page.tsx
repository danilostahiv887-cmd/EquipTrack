import { getCurrentUser } from "@/lib/auth/session";
import { MetricStrip } from "@/components/analytics/metric-strip";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { getDashboardMetrics } from "@/server/services/workflows";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const metrics = await getDashboardMetrics();
  const roleTitle =
    user?.role === "admin"
      ? "Адміністративний огляд"
      : user?.role === "inventory_manager"
        ? "Оперативний огляд"
        : "Мої робочі дані";
  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">{roleTitle.toUpperCase()}</p>
          <h1>Вітаємо, {user?.fullName}</h1>
          <p>
            Актуальний стан обліку та останні зміни в інвентарній картотеці.
          </p>
        </div>
      </header>
      <MetricStrip
        metrics={[
          { label: "Обладнання", value: metrics.equipment },
          { label: "Потребує уваги", value: metrics.repair, tone: "amber" },
          { label: "Нові заявки", value: metrics.requests },
          { label: "Аудити в роботі", value: metrics.audits, tone: "green" },
        ]}
      />
      <section className="dashboard-section">
        <h2>Останні переміщення</h2>
        <WorkflowList rows={metrics.recent} primary="movementType" />
      </section>
    </section>
  );
}
