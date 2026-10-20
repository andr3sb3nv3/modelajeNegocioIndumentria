"use client";
import { useMemo, useState } from "react";
type Prenda = { modelo: string; color: string; talle: string; cant?: number };
import { Modal } from "./Sheet";

export type VentaH = {
  k: string; ids: string[]; f: string; hora: string; local: string; tn: boolean; quien: string; tipo: string; venta: boolean;
  prendas: (Required<Prenda> & { signo: number })[]; monto: number; medio: string; clienta: string; nota: string;
  estado: "ok" | "corregida" | "borrada"; puede: boolean;
};

const $ = (v: number) => "$ " + new Intl.NumberFormat("es-AR").format(Math.round(v));
const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const dia = (iso: string) => { const d = new Date(iso + "T12:00:00Z"); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
const prenda = (p: Prenda) => `${p.modelo} · ${p.color} · T${p.talle}${(p.cant || 1) > 1 ? ` ×${p.cant}` : ""}`;

/** Todas las ventas, por día, con buscador; detalle de cada registro en modo consulta. */
export function Historial({ ventas, locales, colores, admin, local: l0 = "", fijo }: { ventas: VentaH[]; locales: string[]; colores: Record<string, string[]>; admin: boolean; local?: string; fijo?: boolean }) {
  const [local, setLocal] = useState(l0);
  const [soloVentas, setSoloVentas] = useState(false);
  const [q, setQ] = useState("");
  const [todas, setTodas] = useState(false);
  const [abierta, setAbierta] = useState<VentaH | null>(null);

  const lista = useMemo(() => ventas.filter((v) =>
    (todas || v.estado === "ok") && (!local || v.local === local) && (!soloVentas || v.venta) &&
    (!q || n([v.clienta, v.medio, v.quien, v.nota, ...v.prendas.map(prenda)].join(" ")).includes(n(q)))), [ventas, todas, local, q, soloVentas]);
  const porDia = useMemo(() => {
    const m = new Map<string, VentaH[]>();
    for (const v of lista) m.set(v.f, [...(m.get(v.f) || []), v]);
    return [...m.entries()];
  }, [lista]);
  const ocultas = ventas.filter((v) => v.estado !== "ok").length;

  return (
    <div className="hv">
      {!fijo && <div className="vd-loc" role="radiogroup" aria-label="Local">
        {["", ...locales].map((l) => <button key={l || "todos"} className={local === l ? "on" : ""} onClick={() => setLocal(l)}>{l || "Todos"}</button>)}
      </div>}
      <div className="hv-f">
        <input className="buscar" type="search" placeholder="Buscar modelo, clienta, medio…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={soloVentas ? "on" : ""} onClick={() => setSoloVentas(!soloVentas)}>Sólo ventas</button>
      </div>

      {porDia.map(([f, vs]) => (
        <section key={f} className="hv-dia">
          <div className="hv-dh"><b>{dia(f)}</b><span>{(() => { const ok = vs.filter((v) => v.estado === "ok" && v.venta); return `${ok.length} ${ok.length === 1 ? "venta" : "ventas"} · ${$(ok.reduce((a, v) => a + v.monto, 0))}`; })()}</span></div>
          {vs.map((v) => (
            <button key={v.k} className={`hv-v${v.estado !== "ok" ? " off" : ""}`} onClick={() => setAbierta(v)}>
              <span className="hv-h">{v.hora || "—"}</span>
              <span className="hv-p">
                {!v.venta && <i className="hv-t">{v.tipo}</i>}
                {v.prendas.map((p, i) => <b key={i}>{v.tipo === "Cambio" ? (p.signo > 0 ? "Vuelve: " : "Se lleva: ") : ""}{prenda(p)}</b>)}
                <small>{[v.local, v.medio, v.clienta, v.quien].filter(Boolean).join(" · ")}</small>
              </span>
              <span className="hv-m">{v.monto ? $(v.monto) : ""}{v.estado !== "ok" && <em>{v.estado === "corregida" ? "Corregida" : "Borrada"}</em>}</span>
            </button>
          ))}
        </section>
      ))}
      {!lista.length && <p className="empty">{q || local || soloVentas ? "No encontré nada con ese filtro." : "Todavía no hay movimientos en las planillas de demostración."}</p>}
      {ocultas > 0 && <button className="vd-hint vd-link" onClick={() => setTodas(!todas)}>{todas ? "Ocultar borradas y corregidas" : `Ver también borradas y corregidas (${ocultas})`}</button>}

      <Modal open={!!abierta} onClose={() => setAbierta(null)} title={abierta ? (abierta.estado !== "ok" ? `${abierta.tipo} anterior` : abierta.tipo) : ""}
        sub={abierta ? `${dia(abierta.f)} · ${abierta.hora} · cargó ${abierta.quien}` : undefined}>
        {abierta && <Detalle v={abierta} />}
      </Modal>
    </div>
  );
}

function Detalle({ v }: { v: VentaH }) {
  return <div className="hv-ed">
    <div className="vd-okl">{v.prendas.map((p, i) => <div key={i}><b>{prenda(p)}</b></div>)}</div>
    <p className="vd-oks">{[v.local, $(v.monto), v.medio, v.clienta].filter(Boolean).join(" · ")}</p>
    {v.nota && <p className="vd-hint">{v.nota}</p>}
    <p className="vd-hint">Registro de consulta de las planillas de demostración.</p>
  </div>;
}
