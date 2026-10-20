import "server-only";
import type { DiaAh, EvAh } from "@/components/Ahora";
import { getData, type Data } from "./data";
import { grupoCanal, hoyBA } from "./fmt";
import { eventosDeDias } from "./linea";
import { getSemana, sumarDias, type Semana } from "./semana";

export const DIAS = 7;
const enHora = (f: string, hora: string) => Date.parse(`${f}T${hora}:00-03:00`);
const corto = (s: string, n = 140) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/**
 * La línea del tiempo con datos reales, para los `n` días (7 por defecto) que terminan en `hasta`:
 * movimientos de la app y charlas/registros de «Línea del tiempo» (con hora), ventas y gastos de las planillas
 * y notas/alertas del Maestro (en el día), y lo que viene: gastos pendientes con vencimiento.
 */
export async function armarLinea(hasta = hoyBA(), n = DIAS): Promise<{ eventos: EvAh[]; proximos: EvAh[]; dias: DiaAh[]; cmp: DiaAh; avisos: string[]; leido: string }> {
  const hoy = hoyBA();
  const fechas = Array.from({ length: n }, (_, i) => sumarDias(hasta, i - n + 1));
  const avisos: string[] = [];
  const [d, sem, lin] = await Promise.all([
    getData().catch((e) => { avisos.push(`No pude leer las planillas de Ventas y Gastos (${String(e?.message || e).slice(0, 120)}).`); return null as Data | null; }),
    getSemana(Math.max(0, Math.floor((Date.parse(hoy) - Date.parse(hasta)) / 864e5 / 7))).catch(() => null as Semana | null),
    eventosDeDias(fechas),
  ]);
  if (lin.error) avisos.push("No pude leer la hoja Movimientos (ventas y préstamos cargados en la app).");
  if (lin.errorNotas) avisos.push("No pude leer las charlas guardadas en el Carga de datos maestro.");
  if (sem?.maestroError) avisos.push("No pude leer las notas del 17 · Carga de datos maestro.");

  const dias = new Set(fechas);
  const eventos: EvAh[] = [];

  // App + charlas: tienen hora
  for (const e of lin.eventos) {
    const t = enHora(e.f, e.hora), meta = [e.local, e.quien].filter(Boolean).join(" · ");
    if (e.tipo === "nota") eventos.push({ id: e.id, f: e.f, t: e.hora ? t : enHora(e.f, "12:00"), sinHora: !e.hora, tipo: "charla", etiqueta: e.id.startsWith("chat-") ? "Charla" : "Registro", titulo: e.que, detalle: e.detalle || undefined, meta: e.quien, monto: e.monto || undefined });
    else if (e.tipo === "venta") eventos.push({ id: e.id, f: e.f, t, tipo: e.que === "Venta online" ? "online" : "venta", etiqueta: `${e.que} · app`, titulo: e.detalle, meta, monto: e.monto, tachado: e.anulado });
    else eventos.push({ id: e.id, f: e.f, t, tipo: "stock", etiqueta: e.que, titulo: e.detalle, meta, tachado: e.anulado });
  }

  // Planilla de Ventas: sin hora
  (d?.ventas || []).filter((v) => dias.has(v.f)).forEach((v, i) => {
    const online = grupoCanal(v.canal) === "Online";
    eventos.push({
      id: `v${v.f}${i}`, f: v.f, t: enHora(v.f, "12:00"), sinHora: true, tipo: online ? "online" : "venta", etiqueta: online ? "Venta online" : "Venta",
      titulo: [v.modelo || "Sin modelo", v.prendas > 1 ? `${v.prendas} prendas` : ""].filter(Boolean).join(" · "), meta: [v.canal, v.medio].filter(Boolean).join(" · "), monto: v.monto,
    });
  });

  // Planilla de Gastos: sin hora; si un día tiene muchos, van juntos
  for (const f of fechas) {
    const gs = (d?.gastos || []).filter((g) => g.f === f).sort((a, b) => b.imp - a.imp);
    if (gs.length <= 4) gs.forEach((g, i) => eventos.push({ id: `g${f}${i}`, f, t: enHora(f, "12:00"), sinHora: true, tipo: "gasto", titulo: [g.cat, g.prov].filter(Boolean).join(" · "), detalle: g.desc && g.desc !== g.cat ? corto(g.desc) : undefined, meta: [g.tipo, g.est].filter(Boolean).join(" · "), monto: g.imp }));
    else eventos.push({ id: `g${f}`, f, t: enHora(f, "12:00"), sinHora: true, tipo: "gasto", etiqueta: "Gastos", titulo: `${gs.length} gastos cargados`, detalle: `Los más grandes: ${gs.slice(0, 3).map((g) => g.cat).join(", ")}`, monto: gs.reduce((s, g) => s + g.imp, 0) });
  }

  // Carga de datos maestro: notas del día y alertas
  // getSemana trae 14 días (la semana y la anterior), que siempre cubren los 7 pedidos
  const todos = [...(sem?.prev || []), ...(sem?.dias || [])];
  for (const x of todos) {
    if (!dias.has(x.f)) continue;
    const nota = (k: string, etiqueta: string, txt: string) => txt && eventos.push({ id: `m${x.f}${k}`, f: x.f, t: enHora(x.f, "12:00"), sinHora: true, tipo: "maestro", etiqueta, titulo: corto(txt, 220) });
    nota("e", "Qué entró", x.entro); nota("o", "Otros", x.otros); nota("s", "Estado", x.estado); nota("a", "Aclaración", x.aclaraciones);
    x.alertas.forEach((a, i) => eventos.push({ id: `a${x.f}${i}`, f: x.f, t: enHora(x.f, "12:00"), sinHora: true, tipo: "alerta", titulo: corto(a.alerta || a.detalle, 160), detalle: a.queHacer ? corto(a.queHacer) : undefined, meta: a.origen, monto: a.importe || undefined }));
  }

  // Números de cada día (los mismos de Inicio)
  const numeros = (f: string): DiaAh => {
    const x = todos.find((y) => y.f === f);
    return { f, ventas: x?.ventas || 0, prendas: x?.prendas || 0, gastos: x?.gastos || 0 };
  };
  const diasAh = fechas.map(numeros);
  // Para comparar: el mismo día de la semana anterior al último (siempre entra en los 14 días de getSemana)
  const cmp = numeros(sumarDias(hasta, -7));

  // Lo que viene: gastos pendientes que vencen en los próximos 30 días
  const limite = sumarDias(hoy, 30);
  const proximos: EvAh[] = (d?.gastos || []).filter((g) => /pend/i.test(g.est) && g.venc && g.venc >= hoy && g.venc <= limite)
    .sort((a, b) => (a.venc < b.venc ? -1 : 1)).slice(0, 20)
    .map((g, i) => ({ id: `p${i}`, f: g.venc, t: enHora(g.venc, "10:00"), sinHora: true, tipo: "agenda", titulo: [g.cat, g.prov].filter(Boolean).join(" · "), detalle: g.desc && g.desc !== g.cat ? corto(g.desc) : undefined, monto: g.imp }));

  return { eventos, proximos, dias: diasAh, cmp, avisos, leido: d?.leido || new Date().toISOString() };
}
