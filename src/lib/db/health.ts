import { env, isConfigured } from "@/lib/env";

export type DatabaseHealth = {
  status: "ready" | "starting" | "paused" | "setup";
  checkedAt: string;
  wakeUrl?: string;
  message: string;
};

function deriveWakeUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol === "wss:") url.protocol = "https:";
    if (url.protocol === "ws:") url.protocol = "http:";
    url.pathname = "/health";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function wakeUrl() {
  return env.surrealWakeUrl || deriveWakeUrl(env.surrealUrl);
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const checkedAt = new Date().toISOString();
  if (!isConfigured) {
    return {
      status: "setup",
      checkedAt,
      message: "Змінні середовища SurrealDB ще не налаштовані.",
    };
  }

  const url = wakeUrl();
  if (!url) {
    return {
      status: "paused",
      checkedAt,
      message: "Не вдалося визначити адресу перевірки SurrealDB.",
    };
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });
    if (response.ok) {
      return {
        status: "ready",
        checkedAt,
        wakeUrl: url,
        message: "SurrealDB відповідає на health-запит.",
      };
    }
    return {
      status: "starting",
      checkedAt,
      wakeUrl: url,
      message: `SurrealDB ще не готова. HTTP ${response.status}.`,
    };
  } catch {
    return {
      status: "paused",
      checkedAt,
      wakeUrl: url,
      message:
        "SurrealDB не відповідає. Якщо інстанс paused, натисніть Resume instance у Surreal Cloud.",
    };
  }
}
