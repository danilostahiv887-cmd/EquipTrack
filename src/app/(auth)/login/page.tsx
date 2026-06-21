import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/layout/brand-mark";
import { DatabaseWakeScreen } from "@/components/system/database-wake-screen";

export default async function LoginPage() {
  if (!isConfigured) redirect("/setup");
  let currentUser = null;
  try {
    currentUser = await getCurrentUser();
  } catch {
    return (
      <DatabaseWakeScreen reason="Форма входу очікує, поки SurrealDB стане доступною." />
    );
  }
  if (currentUser) redirect("/dashboard");
  return (
    <main className="login-page">
      <section className="login-aside">
        <BrandMark className="login-brand-mark" />
        <p className="eyebrow">EQUIPTRACK / ДОСТУП</p>
        <h1>Інвентарна картотека закладу</h1>
        <p>
          Використовуйте службовий обліковий запис для роботи з обладнанням,
          приміщеннями та актами.
        </p>
      </section>
      <section className="login-panel">
        <p className="eyebrow">ВХІД ДО РОБОЧОГО ПРОСТОРУ</p>
        <h2>Введіть облікові дані</h2>
        <LoginForm />
      </section>
    </main>
  );
}
