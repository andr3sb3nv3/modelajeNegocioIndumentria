import "server-only";
import { normEmail } from "./email";
import { REF_TN, TIPOS, vigentes, type Mov, type Tipo } from "./stock";
import { USUARIO_TN } from "./sync";
import type { VentaH } from "@/components/Historial";

const addDias = (iso: string, k: number) => new Date(Date.parse(iso + "T12:00:00Z") + k * 864e5).toISOString().slice(0, 10);

/**
 * Historial de lo cargado en la app (ventas, devoluciones, cambios, préstamos…) y las ventas de Tiendanube subidas.
 * Una fila = lo que se cargó junto (mismo momento y misma persona); las de Tiendanube, por orden.
 * Las ventas se pueden cambiar; todo se puede borrar. La dueña, siempre; la vendedora, lo suyo de los últimos 2 días.
 */
export function armarHistorial(movs: Mov[], yo: string, admin: boolean, hoy: string): VentaH[] {
  const vivas = new Set(vigentes(movs).map((m) => m.id));
  const anulacion = new Map(movs.filter((m) => m.tipo === "anulacion").map((m) => [m.ref, m]));
  const desde = addDias(hoy, -120);
  const grupos = new Map<string, Mov[]>();
  for (const m of movs) {
    if (m.tipo === "anulacion" || m.f < desde) continue;
    const k = m.ref.startsWith(REF_TN) ? `${m.ref}|${vivas.has(m.id) ? "v" : m.ts}` : `${m.ts}|${m.usuario}|${m.tipo === "vuelve" ? "v" : ""}`;
    grupos.set(k, [...(grupos.get(k) || []), m]);
  }
  return [...grupos.entries()].map(([k, ms]): VentaH => {
    const o = ms[0];
    const viva = ms.every((m) => vivas.has(m.id));
    const tn = o.usuario === USUARIO_TN;
    const propia = normEmail(o.usuario) === normEmail(yo);
    const tipos = [...new Set(ms.map((m) => m.tipo))] as Tipo[];
    const tipo = tipos.some((t) => t.startsWith("cambio")) ? "Cambio" : tn ? "Venta online" : TIPOS[tipos[0]];
    return {
      k, ids: ms.map((m) => m.id), f: o.f, hora: o.ts.slice(11, 16), local: o.local, tn, tipo, venta: tipos.length === 1 && tipos[0] === "venta",
      quien: tn ? "Tiendanube" : o.usuario.split("@")[0] || "—",
      prendas: ms.map((m) => ({ modelo: m.modelo, color: m.color, talle: m.talle, cant: Math.abs(m.cant) || 1, signo: Math.sign(m.cant) })),
      monto: ms.reduce((a, m) => a + m.monto, 0), medio: o.medio, clienta: o.clienta, nota: o.nota,
      estado: viva ? "ok" : /Corregida/.test(anulacion.get(o.id)?.nota || "") ? "corregida" : "borrada",
      puede: viva && (admin || (!tn && propia && o.f >= addDias(hoy, -2))),
    };
  }).sort((a, b) => (a.f + a.hora < b.f + b.hora ? 1 : -1));
}
