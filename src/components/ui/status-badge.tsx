import { label } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const tone = status.includes("repair") || status === "damaged" || status === "under_review" || status === "reported" ? "warning" : status.includes("written") || status === "rejected" || status === "lost" || status === "unusable" ? "danger" : status === "good" || status === "active" || status === "approved" || status === "completed" || status === "found" ? "success" : "neutral";
  return <span className={`status-badge status-${tone}`}>{label(status)}</span>;
}
