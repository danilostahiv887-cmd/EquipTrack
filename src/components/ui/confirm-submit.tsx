"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmSubmit({
  label,
  title,
  description,
  confirmLabel = "Підтвердити",
  tone = "default",
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="dialog-backdrop confirm-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <section
              className="dialog confirm-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="dialog-heading">
                <div>
                  <p className="dialog-kicker">ПОТРІБНЕ ПІДТВЕРДЖЕННЯ</p>
                  <h2 id={titleId}>{title}</h2>
                </div>
                <Button
                  variant="quiet"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Закрити
                </Button>
              </div>
              <p className="confirm-copy">{description}</p>
              <div className="confirm-actions">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Скасувати
                </Button>
                <button
                  className={cn(
                    "button",
                    tone === "danger" ? "button-danger" : "button-primary",
                  )}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    formRef.current?.requestSubmit();
                  }}
                >
                  {confirmLabel}
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        className={cn("inline-danger", tone === "default" && "inline-confirm")}
        type="button"
        onClick={() => {
          formRef.current = triggerRef.current?.form ?? null;
          setOpen(true);
        }}
      >
        {label}
      </button>
      {modal}
    </>
  );
}
