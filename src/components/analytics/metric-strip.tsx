export function MetricStrip({ metrics }: { metrics: Array<{ label: string; value: number; tone?: "cyan" | "amber" | "green" }> }) {
  return <div className="metric-strip">{metrics.map((metric) => <div key={metric.label} className={`metric metric-${metric.tone ?? "cyan"}`}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>;
}
