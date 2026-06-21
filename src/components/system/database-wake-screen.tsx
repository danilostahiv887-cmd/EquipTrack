"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/layout/brand-mark";

type HealthStatus = "ready" | "starting" | "paused" | "setup";
type HealthPayload = {
  status: HealthStatus;
  checkedAt: string;
  message: string;
};

const pollMs = 3000;

export function DatabaseWakeScreen({
  reason = "Підключення до бази даних тимчасово недоступне.",
}: {
  reason?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<HealthStatus>("starting");
  const [message, setMessage] = useState(reason);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function probe() {
      setAttempts((value) => value + 1);
      try {
        const response = await fetch(`/api/health/database?ts=${Date.now()}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as HealthPayload;
        if (!alive) return;
        setStatus(data.status);
        setMessage(data.message);
        if (data.status === "ready") {
          timer = setTimeout(() => router.refresh(), 550);
          return;
        }
      } catch {
        if (!alive) return;
        setStatus("paused");
        setMessage("База даних ще не відповідає. Пробуємо повторно.");
      }
      timer = setTimeout(probe, pollMs);
    }

    probe();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return (
    <main className="db-wake-page">
      <section className="db-wake-panel" aria-live="polite">
        <BrandMark className="setup-brand-mark" />
        <p className="eyebrow">EQUIPTRACK / ОЧІКУВАННЯ БАЗИ</p>
        <h1>
          {status === "ready" ? "База прокинулась" : "Підключаємо SurrealDB"}
        </h1>
        <p>{message}</p>
        <div className="db-wake-meter" aria-hidden="true">
          <span />
        </div>
        <ul className="db-wake-list">
          <li>
            <strong>Стан</strong>
            <span>
              {status === "ready"
                ? "Готово"
                : status === "setup"
                  ? "Не налаштовано"
                  : status === "paused"
                    ? "Очікує відновлення"
                    : "Запускається"}
            </span>
          </li>
          <li>
            <strong>Повтор</strong>
            <span>кожні {pollMs / 1000} секунди</span>
          </li>
          <li>
            <strong>Спроба</strong>
            <span>№{attempts}</span>
          </li>
        </ul>
        {status !== "ready" && (
          <p className="db-wake-note">
            Якщо у Surreal Cloud видно “This instance is paused”, відкрийте
            інстанс і натисніть <b>Resume instance</b>. Ця сторінка сама
            перевірить статус і продовжить роботу після відновлення.
          </p>
        )}
      </section>
    </main>
  );
}
