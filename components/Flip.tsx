"use client";
import { useRef, useState, type ReactNode } from "react";

/** Tarjeta que se da vuelta al tocarla para mostrar «Detrás del dato». */
export function Flip({ children, back, title }: { children: ReactNode; back: ReactNode; title: string }) {
  const [on, setOn] = useState(false);
  const [h, setH] = useState<number | undefined>();
  const wrap = useRef<HTMLDivElement>(null), bk = useRef<HTMLDivElement>(null);
  const toggle = () => {
    const nat = wrap.current?.querySelector<HTMLElement>(".front")?.offsetHeight || 0;
    if (!on) setH(Math.max(nat, (bk.current?.scrollHeight || 0)));
    else setH(undefined);
    setOn(!on);
  };
  return (
    <div ref={wrap} className={`fw${on ? " on" : ""}`} style={{ height: h }} role="button" tabIndex={0} aria-label={`Dar vuelta: ${title}`}
      onClick={(e) => { if (!(e.target as HTMLElement).closest("a")) toggle(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}>
      <div className="fc">
        <div className="front">{children}</div>
        <div className="bk" ref={bk} aria-hidden={!on}>{back}</div>
      </div>
    </div>
  );
}
