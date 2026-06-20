"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function Dialog({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    if (open) { window.addEventListener("keydown", onKey); closeRef.current?.focus(); }
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return <><button className="action-stamp" type="button" onClick={() => setOpen(true)}><span>+</span>{label}</button>{open && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="dialog-heading"><div><p className="dialog-kicker">НОВИЙ СЛУЖБОВИЙ ЗАПИС</p><h2 id={titleId}>{title}</h2></div><Button ref={closeRef} variant="quiet" onClick={() => setOpen(false)}>Закрити</Button></div>{children}</section></div>}</>;
}
