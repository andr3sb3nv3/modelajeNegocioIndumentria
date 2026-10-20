"use client";
import { useState } from "react";
import type { Item, Rec, Reporte } from "@/lib/reporte";

type Rama = { k: string; emoji: string; nombre: string; tono: "bad" | "imp" | "meet" | "adv"; recs: Rec[] };

/** Recomendaciones de un bloque: las que trae el reporte o, si no, las viñetas del detalle («COM-02: texto» → título + aclaración). */
function recsDe(x: Item): Rec[] {
  if (x.recomendaciones?.length) return x.recomendaciones;
  const vin = (x.detalle || "").split("\n").map((l) => l.trim()).filter((l) => /^[-•]\s/.test(l)).map((l) => l.replace(/^[-•]\s/, ""));
  if (!vin.length) return [{ titulo: x.titulo, aclaracion: x.resumen }];
  const may = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  return vin.slice(0, 4).map((l) => {
    // Sin códigos internos adelante («COM-02: …», «BB-A01 y BB-A02: …»)
    const sinCod = l.replace(/^(?:[A-Z]{2,5}-[A-Z]?\d+[\s,y]*)+:\s*/, "");
    const m = sinCod.match(/^([^:(]{3,80}?)\s*(?::\s*|\((.+?)\)[:.]?\s*)(.*)$/);
    if (m) return { titulo: may(m[1].trim()), aclaracion: [m[2], m[3]].filter(Boolean).map((x) => may(x.trim().replace(/[.:]$/, ""))).join(". ") || undefined };
    return { titulo: may(sinCod.replace(/\.$/, "")) };
  });
}

/**
 * Reporte de la mañana como cuadro de ramas: una frase arriba y, abajo, las áreas.
 * Tocás un área y se abren sus recomendaciones del día; tocás una y aparece la aclaración.
 */
export function ReporteManana({ r }: { r: Reporte }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const [rec, setRec] = useState<string | null>(null);
  const ramas: Rama[] = [];
  const hoy = [...r.urgente, ...r.importante];
  if (hoy.length) ramas.push({ k: "hoy", emoji: "⚡", nombre: "Para resolver", tono: r.urgente.length ? "bad" : "imp", recs: hoy.map((x) => ({ titulo: x.titulo, aclaracion: x.resumen })) });
  if (r.reunion) ramas.push({ k: "reu", emoji: "📅", nombre: `Reunión${r.reunion.cuando ? ` · ${r.reunion.cuando}` : " de hoy"}`, tono: "meet", recs: (r.reunion.puntos?.length ? r.reunion.puntos : [r.reunion.titulo]).map((t) => ({ titulo: t })) });
  r.asesores.forEach((x, i) => ramas.push({ k: `a${i}`, emoji: x.emoji === "🤖" ? "✨" : x.emoji || "💬", nombre: x.asesor || x.titulo, tono: "adv", recs: recsDe(x) }));

  return (
    <div className="rp2">
      <p className="rp2-tit">{r.titular}</p>
      <ul className="rp2-arbol">
        {ramas.map((ra) => {
          const on = abierta === ra.k;
          return (
            <li key={ra.k} className={`rp2-rama is-${ra.tono}${on ? " on" : ""}`}>
              <button type="button" className="rp2-nodo" aria-expanded={on} onClick={() => { setAbierta(on ? null : ra.k); setRec(null); }}>
                <span className="rp2-em" aria-hidden>{ra.emoji}</span>
                <span className="rp2-n">{ra.nombre}</span>
                <span className="rp2-c">{ra.recs.length}</span>
                <span className="rp2-fl" aria-hidden>›</span>
              </button>
              {on && (
                <ul className="rp2-hojas">
                  {ra.recs.map((x, j) => {
                    const id = `${ra.k}-${j}`, ab = rec === id;
                    return (
                      <li key={id} className={ab ? "on" : ""}>
                        <button type="button" className="rp2-hoja" aria-expanded={ab} disabled={!x.aclaracion} onClick={() => setRec(ab ? null : id)}>{x.titulo}</button>
                        {ab && x.aclaracion && <p className="rp2-acl">{x.aclaracion}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="rp2-pie">¿Querés saber más de algo? Consultá el asistente de demostración.</p>
    </div>
  );
}
