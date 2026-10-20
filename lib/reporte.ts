import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Reporte de la mañana: lo escribe una rutina de Claude cada mañana (no Vercel) leyendo las carpetas de asesores
 * del Drive y las planillas, y lo deja en data/reportes/AAAA-MM-DD.json en main. La app sólo lo muestra.
 * Formato: ver data/reportes/README.md.
 */

export type Rec = { titulo: string; aclaracion?: string };
export type Fuente = { titulo: string; url?: string };
export type Item = {
  titulo: string;
  /** 1 o 2 líneas: lo que se ve en la tarjeta */
  resumen: string;
  /** Resumen largo para la ventana emergente. Párrafos separados por línea en blanco; líneas con "- " son viñetas. */
  detalle: string;
  fuentes?: Fuente[];
  /** Sólo en asesores: lo que recomienda hoy, cada una con una aclaración corta (si falta, sale de las viñetas del detalle) */
  recomendaciones?: Rec[];
  /** Sólo en asesores: nombre del asesor (ej. «Marketing digital») */
  asesor?: string;
  emoji?: string;
};
export type Reporte = {
  fecha: string;
  generado: string;
  /** 1 o 2 frases con lo más importante del día */
  titular: string;
  urgente: Item[];
  importante: Item[];
  /** Reunión del día (si hay): puntos para llevar */
  reunion?: (Item & { cuando?: string; puntos?: string[] }) | null;
  asesores: Item[];
  /** Documentos leídos y avisos de la rutina (ej. archivos que no pudo leer) */
  leidos?: number;
  avisos?: string[];
};

const DIR = path.join(process.cwd(), "data", "reportes");
const FECHA = /^(\d{4}-\d{2}-\d{2})\.json$/;

/** El reporte de hoy o, si todavía no está, el último que haya (con su fecha). */
export async function ultimoReporte(hoy: string): Promise<Reporte | null> {
  let archivos: string[] = [];
  try { archivos = await readdir(DIR); } catch { return null; }
  const fechas = archivos.map((a) => a.match(FECHA)?.[1]).filter((f): f is string => !!f && f <= hoy).sort().reverse();
  for (const f of fechas) {
    try {
      const r = JSON.parse(await readFile(path.join(DIR, `${f}.json`), "utf8")) as Reporte;
      return { ...r, fecha: r.fecha || f, urgente: r.urgente || [], importante: r.importante || [], asesores: r.asesores || [] };
    } catch { /* archivo roto: se prueba el anterior */ }
  }
  return null;
}
