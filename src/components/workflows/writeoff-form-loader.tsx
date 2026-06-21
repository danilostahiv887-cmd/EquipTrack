"use client";

import { useEffect, useState } from "react";
import {
  WriteoffForm,
  type EquipmentOption,
} from "@/components/workflows/workflow-form";

type WriteoffReferencesResponse = {
  equipment?: EquipmentOption[];
  error?: string;
};

let cachedEquipment: EquipmentOption[] | undefined;

export function WriteoffFormLoader() {
  const [equipment, setEquipment] = useState<EquipmentOption[] | undefined>(
    cachedEquipment,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (cachedEquipment) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/references/writeoffs", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json()) as WriteoffReferencesResponse;
        if (!response.ok)
          throw new Error(
            data.error || "Не вдалося завантажити перелік обладнання.",
          );
        cachedEquipment = data.equipment ?? [];
        setEquipment(cachedEquipment);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Не вдалося завантажити перелік обладнання.",
        );
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  if (error)
    return (
      <p className="reference-load-error" role="alert">
        {error} Закрийте діалог і спробуйте ще раз.
      </p>
    );
  if (!equipment)
    return (
      <div className="reference-loading" aria-live="polite">
        <span aria-hidden="true" />
        <p>Завантажуємо доступні екземпляри обладнання…</p>
      </div>
    );
  return <WriteoffForm equipment={equipment} />;
}
