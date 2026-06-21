import Link from "next/link";
import { getDocuments } from "@/server/services/admin";
import { Pagination } from "@/components/ui/pagination";
import { requirePermission } from "@/lib/auth/guards";
import { label, recordId } from "@/lib/format";

const typeOptions = ["equipment", "room", "category"];
const kindOptions = ["photo", "document"];

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; type?: string; kind?: string }> }) {
  await requirePermission("equipment:manage");
  const search = await searchParams;
  const page = Math.max(1, Number(search.page ?? 1));
  const data = await getDocuments(page, search);
  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">ФАЙЛИ ТА ВКЛАДЕННЯ</p>
          <h1>Документи</h1>
          <p>Фото, сертифікати й службові файли з прив’язкою до карток обліку.</p>
        </div>
      </header>
      <form className="filter-line">
        <input name="q" defaultValue={search.q} placeholder="Назва файлу, тип або прив’язаний об’єкт" />
        <select name="type" defaultValue={search.type ?? ""} aria-label="Фільтр за прив’язаною сутністю">
          <option value="">Усі об’єкти</option>
          {typeOptions.map((type) => <option key={type} value={type}>{label(type)}</option>)}
        </select>
        <select name="kind" defaultValue={search.kind ?? ""} aria-label="Фільтр за видом файлу">
          <option value="">Усі файли</option>
          {kindOptions.map((kind) => <option key={kind} value={kind}>{kind === "photo" ? "Фото" : "Документ"}</option>)}
        </select>
        <button type="submit">Шукати</button>
      </form>
      <div className="workflow-list document-list">
        {data.items.map((item) => {
          const id = recordId(item.id);
          return (
            <article key={id}>
              <div className="workflow-row-main">
                <strong>{String(item.name ?? "Файл")}</strong>
                <small>{String(item.mimeType ?? "Файл")} · {Number(item.size ?? 0).toLocaleString("uk-UA")} байт</small>
              </div>
              <span className="workflow-row-date">{String(item.targetTypeLabel ?? "Запис")}</span>
              {item.targetHref ? <Link href={item.targetHref}>{String(item.targetLabel ?? "Відкрити картку")}</Link> : <span>{String(item.targetLabel ?? "Прив’язку не вказано")}</span>}
              <Link href={`/api/files/${encodeURIComponent(id)}/full`} target="_blank">Відкрити файл</Link>
            </article>
          );
        })}
        {data.items.length === 0 && <p>Документів ще немає.</p>}
      </div>
      <Pagination path="/documents" page={data.page} total={data.total} pageSize={data.pageSize} query={{ q: search.q, type: search.type, kind: search.kind }} />
    </section>
  );
}
