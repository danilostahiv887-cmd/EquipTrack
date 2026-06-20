import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { money, recordId } from "@/lib/format";
import type { Equipment } from "@/server/services/catalog";

export function EquipmentTable({ equipment }: { equipment: Equipment[] }) {
  return <div className="ledger-table equipment-ledger"><div className="ledger-head"><span>Обладнання</span><span>Інвентарний номер</span><span>Вартість</span><span>Стан</span></div>{equipment.map((item) => <Link className="ledger-row" href={`/equipment/${encodeURIComponent(recordId(item.id))}`} key={recordId(item.id)}><span className="equipment-label">{item.photoFileId ? <img src={`/api/files/${encodeURIComponent(item.photoFileId)}/preview`} alt=""/> : <i>Немає фото</i>}<strong>{item.name}</strong></span><code>{item.inventoryNumber}</code><span>{money.format(Number(item.price ?? 0))}</span><StatusBadge status={item.condition} /></Link>)}</div>;
}
