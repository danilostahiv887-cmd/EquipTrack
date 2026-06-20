import { getReferences } from "@/server/services/catalog";
import { recordId } from "@/lib/format";
import { requirePermission } from "@/lib/auth/guards";

export default async function SettingsPage() { await requirePermission("reference:manage"); const data = await getReferences(); const blocks = [{ title: "Корпуси", rows: data.buildings }, { title: "Типи приміщень", rows: data.types }, { title: "Категорії", rows: data.categories }]; return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">ДОВІДНИКИ ЗАКЛАДУ</p><h1>Налаштування</h1><p>Контроль структури корпусів, типів приміщень, категорій та відповідальних осіб.</p></div></header><div className="reference-grid">{blocks.map((block) => <section key={block.title}><h2>{block.title}</h2>{block.rows.map((row) => <p key={recordId(row.id)}>{row.name}</p>)}</section>)}</div></section>; }
