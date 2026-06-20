import { getUsers } from "@/server/services/admin";
import { deactivateUserAction } from "@/server/actions/users";
import { UserForm } from "@/components/admin/user-form";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePermission } from "@/lib/auth/guards";
import { Dialog } from "@/components/ui/dialog";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) { await requirePermission("user:manage"); const page = Math.max(1, Number((await searchParams).page ?? 1)); const data = await getUsers(page); return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">ДОСТУП ДО СИСТЕМИ</p><h1>Користувачі</h1><p>Створення працівників і менеджерів, ролі та контроль активних облікових записів.</p></div><Dialog label="Створити користувача" title="Новий обліковий запис"><UserForm/></Dialog></header><div className="workflow-list">{data.items.map((item) => <article key={String(item.id)}><div><strong>{String(item.fullName)}</strong><span>{String(item.email)} · {String(item.role)}</span></div><div className="row-actions"><StatusBadge status={String(item.status)}/>{item.status === "active" && <form action={deactivateUserAction}><input name="userId" type="hidden" value={String(item.id)}/><button type="submit">Деактивувати</button></form>}</div></article>)}</div><Pagination path="/users" page={data.page} total={data.total} pageSize={data.pageSize}/></section>; }
