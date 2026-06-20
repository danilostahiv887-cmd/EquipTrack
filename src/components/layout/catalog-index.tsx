"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/types";

const modules: Array<{ slug: string; label: string; roles: readonly Role[] }> = [
  { slug: "dashboard", label: "Огляд", roles: ["staff", "inventory_manager", "admin"] }, { slug: "rooms", label: "Приміщення", roles: ["staff", "inventory_manager", "admin"] }, { slug: "equipment", label: "Обладнання", roles: ["staff", "inventory_manager", "admin"] }, { slug: "movements", label: "Рухи", roles: ["inventory_manager", "admin"] }, { slug: "requests", label: "Заявки", roles: ["staff", "inventory_manager", "admin"] }, { slug: "repairs", label: "Ремонти", roles: ["staff", "inventory_manager", "admin"] }, { slug: "audits", label: "Аудити", roles: ["inventory_manager", "admin"] }, { slug: "writeoffs", label: "Списання", roles: ["inventory_manager", "admin"] }, { slug: "documents", label: "Документи", roles: ["inventory_manager", "admin"] }, { slug: "analytics", label: "Аналітика", roles: ["inventory_manager", "admin"] }, { slug: "users", label: "Користувачі", roles: ["admin"] }, { slug: "settings", label: "Довідники", roles: ["admin"] },
];

export function CatalogIndex({ role }: { role: Role }) {
  const pathname = usePathname();
  const [opened, setOpened] = useState(false);
  const entries = modules.filter(({ roles }) => roles.includes(role));
  return <><button className="catalog-mobile-toggle" type="button" onClick={() => setOpened(true)}>Розділи</button><nav className={`catalog-index ${opened ? "catalog-index-open" : ""}`} aria-label="Розділи системи"><button className="catalog-close" type="button" onClick={() => setOpened(false)}>Закрити</button><p>КАРТОТЕКА</p>{entries.map(({ slug, label }) => <Link className={pathname.startsWith(`/${slug}`) ? "catalog-current" : ""} href={`/${slug}`} key={slug} onClick={() => setOpened(false)}><span>{label.slice(0, 2).toUpperCase()}</span>{label}</Link>)}</nav></>;
}
