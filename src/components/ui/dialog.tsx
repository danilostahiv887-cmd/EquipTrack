"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Dialog({
  label,
  title,
  children,
  triggerClassName,
  dialogClassName,
  icon = "+",
  kicker = "НОВИЙ СЛУЖБОВИЙ ЗАПИС",
}: {
  label: string;
  title: string;
  children: ReactNode;
  triggerClassName?: string;
  dialogClassName?: string;
  icon?: ReactNode | false;
  kicker?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    if (open) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
      closeRef.current?.focus();
      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener("keydown", onKey);
      };
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const modal = open && mounted ? createPortal(<div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className={cn("dialog", dialogClassName)} role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="dialog-heading"><div><p className="dialog-kicker">{kicker}</p><h2 id={titleId}>{title}</h2></div><Button ref={closeRef} variant="quiet" onClick={() => setOpen(false)}>Закрити</Button></div>{children}</section></div>, document.body) : null;
  return <><button className={cn("action-stamp", triggerClassName)} type="button" onClick={() => setOpen(true)}>{icon !== false && <span>{icon}</span>}{label}</button>{modal}</>;
}
