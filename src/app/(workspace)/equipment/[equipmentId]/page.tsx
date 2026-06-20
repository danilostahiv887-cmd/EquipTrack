import { notFound } from "next/navigation";
import { EquipmentPassport } from "@/components/inventory/equipment-passport";
import { getEquipmentPassport } from "@/server/services/catalog";

export default async function EquipmentDetailsPage({ params }: { params: Promise<{ equipmentId: string }> }) {
  const { equipmentId } = await params; const data = await getEquipmentPassport(decodeURIComponent(equipmentId));
  if (!data) notFound();
  return <EquipmentPassport data={data} />;
}
