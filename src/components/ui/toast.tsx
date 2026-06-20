export function Toast({ message, tone = "success" }: { message?: string; tone?: "success" | "error" }) {
  if (!message) return null;
  return <p className={`toast toast-${tone}`} role="status">{message}</p>;
}
