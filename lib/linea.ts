import "server-only";
import { unstable_cache } from "./demo-cache";
import { SHEETS } from "./config";
import { num, range, str, toISO } from "./data";
import { hoyBA } from "./fmt";
import { sumarDias } from "./semana";
import { CONSULTA } from "./demo-store";
import { TIPOS, leerMovimientos, type Mov, type Tipo } from "./stock";
import { USUARIO_TN } from "./sync";

/**
 * Línea del tiempo del día, hora a hora, con dos fuentes:
 *  - notas: lo que cuenta el equipo de prueba en sus charlas con ChatGPT (llegan por /api/linea desde un GPT, o pegando el resumen en /pruebas)
 *  - la hoja Movimientos (ventas del local y online, cambios, préstamos, canjes, contenido, devoluciones y anulaciones)
 * Todo queda guardado en la pestaña «Línea del tiempo» del 17 · Carga de datos maestro (una fila por hecho, sin repetir).
 * Las notas se escriben ahí directo (ID «chat-…») y se leen de ahí.
 */
export type Evento = { id: string; f: string; hora: string; tipo: Tipo | "nota"; que: string; detalle: string; local: string; monto: number; quien: string; anulado: boolean };

const quienDe = (u: string) => (u === USUARIO_TN ? "Tiendanube" : u.split("@")[0] || "—");
const prenda = (m: Mov) => [m.modelo, m.color, m.talle && `T${m.talle}`].filter(Boolean).join(" · ");

function aEvento(m: Mov, anulados: Set<string>, porId: Map<string, Mov>): Evento {
  const online = m.usuario === USUARIO_TN;
  let que: string = TIPOS[m.tipo], detalle = prenda(m);
  if (m.tipo === "venta" && online) que = "Venta online";
  if (m.tipo === "anulacion") {
    const o = porId.get(m.ref);
    detalle = o ? `${TIPOS[o.tipo]} · ${prenda(o)}` : m.nota || "un movimiento";
  }
  const extra = [m.cant > 1 && m.tipo !== "anulacion" ? `${m.cant} prendas` : "", m.medio, m.clienta].filter(Boolean).join(" · ");
  return {
    id: m.id, f: m.f, hora: m.ts.slice(11, 16), tipo: m.tipo, que, detalle: extra ? `${detalle} — ${extra}` : detalle,
    local: m.local, monto: m.tipo === "venta" ? m.monto : 0, quien: quienDe(m.usuario), anulado: anulados.has(m.id),
  };
}

/** Sólo lo que sale de la hoja Movimientos (es lo que se archiva). */
async function movimientosDe(fechas: string[]): Promise<{ eventos: Evento[]; error?: string }> {
  const { movs, error } = await leerMovimientos();
  const anulados = new Set(movs.filter((m) => m.tipo === "anulacion").map((m) => m.ref));
  const porId = new Map(movs.map((m) => [m.id, m]));
  const dias = new Set(fechas);
  // La fecha del día sale de «Fecha y hora» (cuándo se cargó), no de la fecha de la venta
  const delDia = movs.filter((m) => dias.has(m.ts.slice(0, 10)) && m.ts.length >= 16);
  return { eventos: delDia.map((m) => ({ ...aEvento(m, anulados, porId), f: m.ts.slice(0, 10) })), error };
}
const movimientosDelDia = (f: string) => movimientosDe([f]);

const porHora = (a: Evento, b: Evento) => (a.hora < b.hora ? -1 : a.hora > b.hora ? 1 : 0);

/** Notas + movimientos de esos días, ordenados por día y hora. */
export async function eventosDeDias(fechas: string[]): Promise<{ eventos: Evento[]; error?: string; errorNotas?: string }> {
  const [m, n] = await Promise.all([movimientosDe(fechas), leerNotas(fechas)]);
  // Las filas archivadas desde Movimientos ya están en m: del Maestro sólo van las que cargó otro (charlas, ChatGPT, a mano)
  const ya = new Set(m.eventos.map((e) => e.id));
  const eventos = [...n.notas.filter((x) => !ya.has(x.id)), ...m.eventos].sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : porHora(a, b)));
  return { eventos, error: m.error, errorNotas: n.error };
}
export const eventosDelDia = (f: string) => eventosDeDias([f]);

// ---------- notas de las charlas con ChatGPT ----------

export type NuevaNota = { hora: string; que: string; detalle?: string };
const limpio = (s: unknown, n: number) => String(s ?? "").replace(/[\r\t]+/g, " ").replace(/\n+/g, " · ").trim().slice(0, n);
export const horaOk = (h: string) => { const m = String(h).trim().match(/^(\d{1,2})(?:[:.h](\d{2}))?/); return m && Number(m[1]) < 24 && Number(m[2] || 0) < 60 ? `${m[1].padStart(2, "0")}:${m[2] || "00"}` : ""; };


async function leerNotas(fechas: string[]): Promise<{ notas: Evento[]; error?: string }> {
  const dias = new Set(fechas);
  try {
    const rows = await range(SHEETS.maestro, `'${HOJA}'!A2:H`);
    // Todo lo que esté en «Línea del tiempo» (charlas, lo que agregue ChatGPT o alguien a mano); la hora puede faltar
    const notas = rows.map((r, i) => ({ r, i })).filter(({ r }) => str(r[2]) && dias.has(toISO(r[0]))).map(({ r, i }) => ({
      id: str(r[7]) || `fila-${i + 2}`, f: toISO(r[0]), hora: horaOk(str(r[1])), tipo: "nota" as const, que: str(r[2]), detalle: str(r[3]), local: str(r[4]),
      monto: num(r[5]), quien: str(r[6]), anulado: false,
    }));
    return { notas };
  } catch (e) {
    const msg = String((e as Error).message);
    if (/Unable to parse range/.test(msg)) return { notas: [] };
    return { notas: [], error: msg };
  }
}

/** Guarda notas en el Maestro. Devuelve cuántas guardó. */
export async function guardarNotas(_f: string, _quien: string, _nuevas: NuevaNota[]): Promise<number> { throw new Error(CONSULTA); }

/**
 * Resumen pegado de ChatGPT → notas. Cada línea que empieza con una hora («9:30», «09.30», «15 h», «- 18:00 —») abre una nota;
 * las líneas sin hora se suman como detalle de la anterior.
 */
export function parsearResumen(texto: string): NuevaNota[] {
  const out: NuevaNota[] = [];
  for (const l0 of texto.split(/\r?\n/)) {
    const l = l0.replace(/\*\*/g, "").trim();
    if (!l) continue;
    // Hace falta «:mm», una «h» o un separador después del número, así «2 vestidos vendidos» no se lee como las 2
    const m = l.match(/^[-•*·]?\s*(?:a las\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:(hs?|hrs|horas)\b)?\.?\s*([-–—:·|)])?\s*(.+)$/i);
    const hora = m && (m[2] || m[3] || m[4]) ? horaOk(`${m[1]}:${m[2] || "00"}`) : "";
    if (m && hora) out.push({ hora, que: m[5].trim() });
    else if (out.length) { const u = out[out.length - 1]; u.detalle = u.detalle ? `${u.detalle} · ${l}` : l; }
  }
  return out;
}

// ---------- registro histórico en el Drive ----------

const HOJA = "Línea del tiempo";
const HEAD = ["Fecha", "Hora", "Qué pasó", "Detalle", "Local", "Monto", "Quién", "ID"];
const P = "Carga de datos maestro";

export type ResultadoArchivo =
  | { ok: true; cuando: string; nuevas: number; demo?: boolean }
  | { ok: false; cuando: string; sinPermiso: boolean; error: string };

/** Agrega al Maestro los hechos de esos días que todavía no estén (por ID). Nunca borra ni cambia filas. */
export async function archivarDias(_fechas: string[]): Promise<ResultadoArchivo> {
  return { ok: false, cuando: new Date().toISOString(), sinPermiso: true, error: CONSULTA };
}
export async function asegurarPestanas(): Promise<void> { throw new Error(CONSULTA); }
export const archivarRecientes = async (): Promise<ResultadoArchivo> => archivarDias([]);
export const archivarRecientesCada15 = archivarRecientes;
