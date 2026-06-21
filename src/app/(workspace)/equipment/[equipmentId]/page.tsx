import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { EquipmentPassport } from "@/components/inventory/equipment-passport";
import { getEquipmentPassport, getReferences } from "@/server/services/catalog";

export default async function EquipmentDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ equipmentId: string }>;
  searchParams: Promise<{ instances?: string }>;
}) {
  const [{ equipmentId }, search] = await Promise.all([params, searchParams]);
  const [data, references, user] = await Promise.all([
    getEquipmentPassport(decodeURIComponent(equipmentId), search.instances),
    getReferences(),
    getCurrentUser(),
  ]);
  if (!data) notFound();
  return (
    <EquipmentPassport
      data={data}
      references={references}
      canManage={Boolean(user && can(user, "equipment:manage"))}
    />
  );
}
