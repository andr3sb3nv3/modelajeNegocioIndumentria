"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Ventana emergente controlada (abajo en el celular, centrada en pantallas grandes). */
export function Modal({ open, onClose, title, sub, children }: { open: boolean; onClose: () => void; title: string; sub?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); document.body.style.overflow = "hidden"; }
    if (!open && d.open) d.close();
    if (!open) { document.body.style.overflow = ""; d.style.transform = ""; }
  }, [open]);
  // En el celular se cierra también deslizando el encabezado hacia abajo
  const mover = (dy: number) => { const d = ref.current; if (d) d.style.transform = dy > 0 ? `translateY(${dy}px)` : ""; };
  const soltar = () => {
    const g = drag.current; drag.current = null;
    const d = ref.current; if (d) d.style.transition = "transform .2s ease";
    if (g && g.dy > 90) onClose(); else mover(0);
    setTimeout(() => { if (ref.current) ref.current.style.transition = ""; }, 220);
  };
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sh-h"
        onPointerDown={(e) => { if (!(e.target as HTMLElement).closest("button")) { drag.current = { y: e.clientY, dy: 0 }; e.currentTarget.setPointerCapture(e.pointerId); } }}
        onPointerMove={(e) => { const g = drag.current; if (g) { g.dy = e.clientY - g.y; mover(g.dy); } }}
        onPointerUp={soltar} onPointerCancel={soltar}>
        <div><div className="sh-t">{title}</div>{sub && <div className="sh-s">{sub}</div>}</div>
        <button type="button" className="burger" onClick={onClose} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className="sh-b">{open && children}</div>
    </dialog>
  );
}

/** Link chico que abre una ventana emergente con contenido fijo. */
export function Sheet({ label, title, sub, children }: { label: ReactNode; title: string; sub?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="more" onClick={() => setOpen(true)}>{label} ›</button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} sub={sub}>{children}</Modal>
    </>
  );
}
