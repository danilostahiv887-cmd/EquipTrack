import Link from "next/link";
import { getDocuments } from "@/server/services/admin";
import { Pagination } from "@/components/ui/pagination";
import { requirePermission } from "@/lib/auth/guards";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) { await requirePermission("equipment:manage"); const page = Math.max(1, Number((await searchParams).page ?? 1)); const data = await getDocuments(page); return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">БІНАРНЕ СХОВИЩЕ</p><h1>Документи</h1><p>Файли залишаються у SurrealDB та відкриваються лише через захищений маршрут.</p></div></header><div className="workflow-list">{data.items.map((item) => <article key={String(item.id)}><div><strong>{String(item.name)}</strong><span>{String(item.mimeType)} · {Number(item.size ?? 0).toLocaleString("uk-UA")} байт</span></div><Link href={`/api/files/${encodeURIComponent(String(item.id))}/full`}>Відкрити</Link></article>)}{data.items.length === 0 && <p>Документів ще немає.</p>}</div><Pagination path="/documents" page={data.page} total={data.total} pageSize={data.pageSize}/></section>; }
