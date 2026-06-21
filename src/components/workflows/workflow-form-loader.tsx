"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { recordId } from "@/lib/format";
import type {
  AuditItemOption,
  EquipmentOption,
  RoomOption,
} from "@/components/workflows/workflow-form";

const MovementForm = dynamic(
  () =>
    import("@/components/workflows/workflow-form").then(
      (module) => module.MovementForm,
    ),
  { ssr: false },
);
const TransferRequestForm = dynamic(
  () =>
    import("@/components/workflows/workflow-form").then(
      (module) => module.TransferRequestForm,
    ),
  { ssr: false },
);
const RepairForm = dynamic(
  () =>
    import("@/components/workflows/workflow-form").then(
      (module) => module.RepairForm,
    ),
  { ssr: false },
);
const AuditForm = dynamic(
  () =>
    import("@/components/workflows/workflow-form").then(
      (module) => module.AuditForm,
    ),
  { ssr: false },
);
const AuditScanForm = dynamic(
  () =>
    import("@/components/workflows/workflow-form").then(
      (module) => module.AuditScanForm,
    ),
  { ssr: false },
);

type WorkflowReferences = {
  equipment: EquipmentOption[];
  rooms: RoomOption[];
  error?: string;
};
type AuditReferences = { rooms: RoomOption[]; error?: string };
type AuditScanReferences = {
  equipment: EquipmentOption[];
  auditItems: AuditItemOption[];
  error?: string;
};
type AuditFormData = {
  id?: unknown;
  title?: string;
  roomId?: string;
  plannedDate?: string;
  auditScope?: string;
  expectedItemCount?: number;
  auditNote?: string;
};

const referenceCache = new Map<string, unknown>();

function ReferenceLoading({ text }: { text: string }) {
  return (
    <div className="reference-loading" aria-live="polite">
      <span aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

function ReferenceError({ message }: { message: string }) {
  return (
    <p className="reference-load-error" role="alert">
      {message} Закрийте діалог і спробуйте ще раз.
    </p>
  );
}

function useReferences<T extends { error?: string }>(key: string, url: string) {
  const [data, setData] = useState<T | undefined>(
    () => referenceCache.get(key) as T | undefined,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (data) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as T;
        if (!response.ok)
          throw new Error(payload.error || "Не вдалося завантажити довідники.");
        referenceCache.set(key, payload);
        setData(payload);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Не вдалося завантажити довідники.",
        );
      }
    }
    void load();
    return () => controller.abort();
  }, [data, key, url]);

  return { data, error };
}

function WorkflowFormReferencesLoader({
  scope,
  children,
}: {
  scope: "movements" | "requests" | "repairs";
  children: (references: WorkflowReferences) => ReactNode;
}) {
  const { data, error } = useReferences<WorkflowReferences>(
    `workflow:${scope}`,
    `/api/references/workflows/${scope}`,
  );
  if (error) return <ReferenceError message={error} />;
  if (!data)
    return (
      <ReferenceLoading text="Завантажуємо доступні екземпляри та приміщення…" />
    );
  return <>{children(data)}</>;
}

export function MovementFormLoader() {
  return (
    <WorkflowFormReferencesLoader scope="movements">
      {({ equipment, rooms }) => (
        <MovementForm equipment={equipment} rooms={rooms} />
      )}
    </WorkflowFormReferencesLoader>
  );
}

export function TransferRequestFormLoader() {
  return (
    <WorkflowFormReferencesLoader scope="requests">
      {({ equipment, rooms }) => (
        <TransferRequestForm equipment={equipment} rooms={rooms} />
      )}
    </WorkflowFormReferencesLoader>
  );
}

export function RepairFormLoader() {
  return (
    <WorkflowFormReferencesLoader scope="repairs">
      {({ equipment, rooms }) => (
        <RepairForm equipment={equipment} rooms={rooms} />
      )}
    </WorkflowFormReferencesLoader>
  );
}

export function AuditFormLoader({
  audit,
  mode = "create",
}: {
  audit?: AuditFormData;
  mode?: "create" | "edit";
}) {
  const { data, error } = useReferences<AuditReferences>(
    "workflow:audits",
    "/api/references/workflows/audits",
  );
  if (error) return <ReferenceError message={error} />;
  if (!data) return <ReferenceLoading text="Завантажуємо перелік приміщень…" />;
  return <AuditForm rooms={data.rooms} audit={audit} mode={mode} />;
}

export function AuditScanFormLoader({
  auditId,
  auditRoomId,
}: {
  auditId: unknown;
  auditRoomId?: string;
}) {
  const id = recordId(auditId);
  const { data, error } = useReferences<AuditScanReferences>(
    `audit-scan:${id}`,
    `/api/audits/${encodeURIComponent(id)}/scan-references`,
  );
  if (error) return <ReferenceError message={error} />;
  if (!data)
    return <ReferenceLoading text="Готуємо реєстр екземплярів для звіряння…" />;
  return (
    <AuditScanForm
      auditId={auditId}
      auditRoomId={auditRoomId}
      equipment={data.equipment}
      auditItems={data.auditItems}
    />
  );
}
