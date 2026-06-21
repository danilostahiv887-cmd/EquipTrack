"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { Role } from "@/lib/types";

type Module = {
  slug: string;
  label: string;
  code: string;
  roles: readonly Role[];
};

const groups: Array<{ title: string; modules: Module[] }> = [
  {
    title: "Робочий простір",
    modules: [
      {
        slug: "dashboard",
        label: "Огляд",
        code: "ОГ",
        roles: ["staff", "inventory_manager", "admin"],
      },
      {
        slug: "notifications",
        label: "Сповіщення",
        code: "СП",
        roles: ["staff", "inventory_manager", "admin"],
      },
    ],
  },
  {
    title: "Облік",
    modules: [
      {
        slug: "rooms",
        label: "Приміщення",
        code: "ПР",
        roles: ["staff", "inventory_manager", "admin"],
      },
      {
        slug: "equipment",
        label: "Обладнання",
        code: "ОБ",
        roles: ["staff", "inventory_manager", "admin"],
      },
      {
        slug: "movements",
        label: "Рухи",
        code: "РУ",
        roles: ["inventory_manager", "admin"],
      },
      {
        slug: "documents",
        label: "Документи",
        code: "ДО",
        roles: ["inventory_manager", "admin"],
      },
    ],
  },
  {
    title: "Контроль",
    modules: [
      {
        slug: "requests",
        label: "Заявки",
        code: "ЗА",
        roles: ["staff", "inventory_manager", "admin"],
      },
      {
        slug: "repairs",
        label: "Ремонти",
        code: "РЕ",
        roles: ["inventory_manager", "admin"],
      },
      {
        slug: "audits",
        label: "Аудити",
        code: "АУ",
        roles: ["inventory_manager", "admin"],
      },
      {
        slug: "writeoffs",
        label: "Списання",
        code: "СЛ",
        roles: ["inventory_manager", "admin"],
      },
    ],
  },
  {
    title: "Адміністрування",
    modules: [
      {
        slug: "analytics",
        label: "Аналітика",
        code: "АН",
        roles: ["inventory_manager", "admin"],
      },
      { slug: "users", label: "Користувачі", code: "КО", roles: ["admin"] },
      { slug: "audit-log", label: "Журнал дій", code: "ЖУ", roles: ["admin"] },
      { slug: "settings", label: "Довідники", code: "ДВ", roles: ["admin"] },
    ],
  },
];

export function CatalogIndex({ role }: { role: Role }) {
  const pathname = usePathname();
  const [opened, setOpened] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(
      window.localStorage.getItem("equiptrack.catalog.collapsed") === "1",
    );
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem(
        "equiptrack.catalog.collapsed",
        next ? "1" : "0",
      );
      return next;
    });
  const closeMobile = () => {
    if (opened) startTransition(() => setOpened(false));
  };
  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          modules: group.modules.filter(({ roles }) => roles.includes(role)),
        }))
        .filter((group) => group.modules.length > 0),
    [role],
  );
  return (
    <>
      <button
        className="catalog-mobile-toggle"
        type="button"
        onClick={() => setOpened(true)}
      >
        Розділи
      </button>
      <nav
        className={`catalog-index ${opened ? "catalog-index-open" : ""} ${collapsed ? "catalog-collapsed" : ""}`}
        aria-label="Розділи системи"
      >
        <button
          className="catalog-dock-toggle"
          type="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Розгорнути картотеку" : "Згорнути картотеку"}
          title={collapsed ? "Розгорнути картотеку" : "Згорнути картотеку"}
          onClick={toggleCollapsed}
        >
          <span className="catalog-arrow-glyph" aria-hidden="true">
            {collapsed ? "‹‹" : "››"}
          </span>
          <span className="catalog-arrow-text">
            {collapsed ? "Розгорнути" : "Згорнути"}
          </span>
        </button>
        <header className="catalog-heading">
          <div>
            <p>КАРТОТЕКА</p>
            <span>Розділи системи</span>
          </div>
          <button
            className="catalog-close"
            type="button"
            onClick={() => setOpened(false)}
          >
            Закрити
          </button>
        </header>
        <div className="catalog-groups">
          {visibleGroups.map((group) => (
            <section className="catalog-group" key={group.title}>
              <h2>{group.title}</h2>
              {group.modules.map(({ slug, label, code }) => (
                <Link
                  className={
                    pathname.startsWith(`/${slug}`) ? "catalog-current" : ""
                  }
                  href={`/${slug}`}
                  key={slug}
                  onClick={closeMobile}
                >
                  <span>{code}</span>
                  <b>{label}</b>
                </Link>
              ))}
            </section>
          ))}
        </div>
      </nav>
    </>
  );
}
