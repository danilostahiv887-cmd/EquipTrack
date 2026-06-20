import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  return <main className="workspace-empty"><p className="eyebrow">РОБОЧИЙ ПРОСТІР</p><h1>Вітаємо, {user?.fullName}</h1><p>Модулі обліку завантажуються після підключення даних SurrealDB.</p></main>;
}
