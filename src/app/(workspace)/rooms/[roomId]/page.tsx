import { notFound } from "next/navigation";
import { RoomPassport } from "@/components/rooms/room-passport";
import { getRoomPassport } from "@/server/services/catalog";

export default async function RoomDetailsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params; const data = await getRoomPassport(decodeURIComponent(roomId));
  if (!data) notFound();
  return <RoomPassport data={data} />;
}
