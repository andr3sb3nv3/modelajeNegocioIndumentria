import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Interacción con Claude y Codex (/ia): lo que el equipo de ejemplo le pide a Claude en el proyecto (o a Codex) queda como archivo en el repo y
 * la app sólo lo muestra. Sin claves de IA en Vercel. Convención en data/ia/LEEME.md.
 *  - Vistas: data/ia/vistas/AAAA-MM-DD-HHMM-algo.json  → { fecha, pedido, titulo, resumen, puntos?, html, fuentes?, origen?, quien?, charla? }
 *  - Imágenes: public/ia/imagenes/AAAA-MM-DD-HHMM-algo.(png|jpg|jpeg|webp), con un .json al lado opcional
 *    { titulo?, pedido?, fecha? }
 */
export type Fuente = { titulo: string; url?: string };
/** Un mensaje de una charla guardada: quién habló (Equipo demo, Claude, Codex) y qué dijo */
export type Mensaje = { quien: string; texto: string };
/** Una frase corta de lo que muestra la vista; «ancla» (selector CSS dentro de la vista) es la parte a la que lleva */
export type Punto = { texto: string; ancla?: string };
/** origen: «pedido» suelto, «rutina» (la de cada mañana) o «charla» (una conversación cerrada y guardada) */
export type Origen = "pedido" | "rutina" | "charla";
export type VistaIA = { id: string; tipo: "vista"; fecha: string; pedido: string; titulo: string; resumen: string; html: string; fuentes: Fuente[]; puntos: Punto[];
  origen: Origen; quien: string; charla: Mensaje[] };
export type ImagenIA = { id: string; tipo: "imagen"; fecha: string; pedido: string; titulo: string; src: string };
export type ItemIA = VistaIA | ImagenIA;

const VISTAS = path.join(process.cwd(), "data", "ia", "vistas");
const IMAGENES = path.join(process.cwd(), "public", "ia", "imagenes");
const EXT_IMG = /\.(png|jpe?g|webp|gif)$/i;

/** «2026-10-11-1730-proximos-dias» → «2026-10-11T17:30:00-03:00» (si el nombre trae fecha y hora) */
function fechaDeNombre(n: string) {
  const m = n.match(/^(\d{4}-\d{2}-\d{2})(?:-(\d{2})(\d{2}))?/);
  return m ? `${m[1]}T${m[2] || "12"}:${m[3] || "00"}:00-03:00` : "";
}
const lista = async (dir: string) => { try { return await readdir(dir); } catch { return []; } };
const leerJSON = async (f: string) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return null; } };

export async function itemsIA(): Promise<ItemIA[]> {
  const [vs, is] = await Promise.all([lista(VISTAS), lista(IMAGENES)]);
  const vistas = (await Promise.all(vs.filter((n) => n.endsWith(".json")).map(async (n): Promise<VistaIA | null> => {
    const j = await leerJSON(path.join(VISTAS, n));
    if (!j || typeof j.html !== "string") return null;
    const id = n.replace(/\.json$/, "");
    return { id, tipo: "vista", fecha: String(j.fecha || fechaDeNombre(id)), pedido: String(j.pedido || ""), titulo: String(j.titulo || id), resumen: String(j.resumen || ""), html: j.html, fuentes: Array.isArray(j.fuentes) ? j.fuentes : [],
      puntos: Array.isArray(j.puntos) && j.puntos.length
        ? j.puntos.filter((p: Punto) => p && p.texto).map((p: Punto) => ({ texto: String(p.texto), ...(p.ancla ? { ancla: String(p.ancla) } : {}) }))
        : String(j.resumen || "").split(/(?<=[.:])\s+/).map((t) => t.replace(/[.:]$/, "").trim()).filter(Boolean).map((texto) => ({ texto })),
      origen: j.origen === "rutina" || j.origen === "charla" ? j.origen : "pedido", quien: String(j.quien || ""),
      charla: Array.isArray(j.charla) ? j.charla.filter((m: Mensaje) => m && m.texto).map((m: Mensaje) => ({ quien: String(m.quien || ""), texto: String(m.texto) })) : [] };
  }))).filter((x): x is VistaIA => !!x);
  const imagenes = await Promise.all(is.filter((n) => EXT_IMG.test(n)).map(async (n): Promise<ImagenIA> => {
    const id = n.replace(EXT_IMG, "");
    const j = (await leerJSON(path.join(IMAGENES, id + ".json"))) || {};
    return { id, tipo: "imagen", fecha: String(j.fecha || fechaDeNombre(id)), pedido: String(j.pedido || ""), titulo: String(j.titulo || j.pedido || "Imagen"), src: `/ia/imagenes/${encodeURIComponent(n)}` };
  }));
  return [...vistas, ...imagenes].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.id < b.id ? 1 : -1));
}
