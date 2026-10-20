"use client";
import { useState, type ReactNode } from "react";
import { Modal } from "./Sheet";

/** Fila de lista que al tocarla abre el detalle desde abajo. */
export function FilaDetalle({ fila, title, sub, className = "li", children }: { fila: ReactNode; title: string; sub?: ReactNode; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`${className} tap`} onClick={() => setOpen(true)}>{fila}</button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} sub={sub}>{children}</Modal>
    </>
  );
}
