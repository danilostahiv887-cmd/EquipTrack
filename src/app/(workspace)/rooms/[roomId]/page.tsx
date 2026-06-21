import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { RoomPassport } from "@/components/rooms/room-passport";
import { getReferences, getRoomPassport } from "@/server/services/catalog";

export default async function RoomDetailsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params; const [data, references, user] = await Promise.all([getRoomPassport(decodeURIComponent(roomId)), getReferences(), getCurrentUser()]);
  if (!data) notFound();
  return <RoomPassport data={data} references={references} canManage={Boolean(user && can(user, "room:manage"))} />;
}
