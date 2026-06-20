import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { recordId } from "@/lib/format";
import type { Room } from "@/server/services/catalog";

export function RoomTable({ rooms }: { rooms: Room[] }) {
  return <div className="ledger-table"><div className="ledger-head"><span>Приміщення</span><span>Поверх</span><span>Місткість</span><span>Стан</span></div>{rooms.map((room) => <Link className="ledger-row" href={`/rooms/${encodeURIComponent(recordId(room.id))}`} key={recordId(room.id)}><strong>{room.number}{room.name ? ` · ${room.name}` : ""}</strong><span>{room.floor}</span><span>{room.capacity}</span><StatusBadge status={room.status} /></Link>)}</div>;
}
