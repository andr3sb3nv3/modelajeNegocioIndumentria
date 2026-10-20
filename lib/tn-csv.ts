/**
 * Lee el archivo que baja Tiendanube en «Ventas › Lista de ventas › Exportar lista» (CSV, separado por «;»),
 * o lo mismo copiado de una planilla (separado por tabs). Una fila por producto: si la orden tiene dos prendas,
 * la segunda fila repite el número de orden y a veces deja vacíos los datos de la orden, que se toman de la primera.
 * No depende de nombres exactos de columna: busca por palabras clave, con o sin tildes.
 */

export type LineaCSV = { nombre: string; valores: string[]; cant: number; precio: number };
export type OrdenCSV = {
  numero: string; id: string; f: string; estado: string; pago: string; medio: string; clienta: string; total: number;
  /** recibida = pago recibido y no cancelada; cancelada = se canceló; pendiente = todavía no se cobró (o rechazada / devuelta) */
  situacion: "recibida" | "cancelada" | "pendiente";
  lineas: LineaCSV[];
};
export type Lectura = { ordenes: OrdenCSV[]; error?: string; columnas: string[] };

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Separa un CSV respetando comillas (los nombres de producto traen comas). */
function filas(texto: string, sep: string): string[][] {
  const out: string[][] = [];
  let fila: string[] = [], campo = "", comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false; }
      else campo += c;
    } else if (c === '"' && campo === "") comillas = true;
    else if (c === sep) { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); campo = "";
      if (fila.some((x) => x.trim())) out.push(fila);
      fila = [];
    } else campo += c;
  }
  fila.push(campo);
  if (fila.some((x) => x.trim())) out.push(fila);
  return out;
}

/** «$ 89.000,00», «89000.00», «89.000» → 89000 */
export function plata(s: string): number {
  let t = String(s ?? "").replace(/[^\d.,-]/g, "");
  if (!t) return 0;
  const coma = t.lastIndexOf(","), punto = t.lastIndexOf(".");
  if (coma >= 0 && punto >= 0) t = coma > punto ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (coma >= 0) t = /,\d{1,2}$/.test(t) && (t.match(/,/g) || []).length === 1 ? t.replace(",", ".") : t.replace(/,/g, "");
  else if (punto >= 0 && ((t.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(t))) t = t.replace(/\./g, "");
  return Number(t) || 0;
}

/** «13/10/2026 15:32:10», «13/10/26», «2026-10-13 15:32» → «2026-10-13» */
export function fecha(s: string): string {
  const t = String(s ?? "").trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}

/** «Vestido Tokio (Verde, 2)» → nombre «Vestido Tokio», valores [Verde, 2] */
export function variante(nombre: string): { nombre: string; valores: string[] } {
  const m = String(nombre).trim().match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (!m) return { nombre: String(nombre).trim(), valores: [] };
  return { nombre: m[1].trim(), valores: m[2].split(/\s*[,/]\s*/).map((x) => x.trim()).filter(Boolean) };
}

// Cada dato, con las palabras que lo identifican en el encabezado (la primera que aparezca gana)
const COLS = {
  numero: [/^(numero|nro|n°|#) de (la )?orden$/, /^orden$/, /numero de orden/, /^order number$/],
  id: [/^identificador de la orden$/, /^id de (la )?orden$/, /^order id$/],
  fecha: [/^fecha$/, /^fecha de (la )?(orden|compra|creacion)/, /^date$/],
  fechaPago: [/^fecha de pago/],
  estado: [/^estado de la orden$/, /^estado$/, /^status$/],
  pago: [/^estado del pago$/, /estado de pago/, /^payment status$/],
  medio: [/^medio de pago$/, /forma de pago/, /^payment method$/],
  clienta: [/^nombre del comprador$/, /^comprador$/, /^nombre( y apellido)?$/, /^cliente$/],
  total: [/^total$/, /^total de la orden$/],
  producto: [/^nombre del producto$/, /^producto$/, /^product name$/],
  precio: [/^precio del producto$/, /^precio( unitario)?$/, /^product price$/],
  cant: [/^cantidad del producto$/, /^cantidad$/, /^quantity$/],
  variante: [/^variante$/, /^variantes$/, /^variant$/],
};
type Col = keyof typeof COLS;

/** Decodifica el archivo: Tiendanube a veces lo baja en UTF-8 y a veces en Latin-1 (Excel). */
export function decodificar(buf: ArrayBuffer): string {
  const utf = new TextDecoder("utf-8").decode(buf);
  return utf.includes("�") ? new TextDecoder("windows-1252").decode(buf) : utf;
}

export function leerCSV(texto: string): Lectura {
  const limpio = String(texto ?? "").replace(/^﻿/, "");
  const primera = limpio.split(/\r?\n/, 1)[0] || "";
  const cuenta = (c: string) => primera.split(c).length - 1;
  const sep = [["\t", cuenta("\t")], [";", cuenta(";")], [",", cuenta(",")]].sort((a, b) => (b[1] as number) - (a[1] as number))[0][0] as string;
  const todas = filas(limpio, sep);
  if (todas.length < 2) return { ordenes: [], columnas: [], error: "El archivo está vacío o no tiene ventas." };
  const head = todas[0].map((h) => sinTildes(h).replace(/[.:]/g, ""));
  const idx = {} as Record<Col, number>;
  for (const k of Object.keys(COLS) as Col[]) {
    idx[k] = -1;
    for (const re of COLS[k]) { const i = head.findIndex((h) => re.test(h)); if (i >= 0) { idx[k] = i; break; } }
  }
  if (idx.numero < 0 || idx.producto < 0)
    return { ordenes: [], columnas: todas[0], error: "No encontré las columnas «Número de orden» y «Nombre del producto». ¿Es el archivo de Ventas › Exportar lista?" };

  const val = (r: string[], k: Col) => (idx[k] >= 0 ? String(r[idx[k]] ?? "").trim() : "");
  const porNumero = new Map<string, OrdenCSV>();
  for (const r of todas.slice(1)) {
    const numero = val(r, "numero").replace(/^#/, "");
    if (!numero) continue;
    let o = porNumero.get(numero);
    if (!o) { o = { numero, id: "", f: "", estado: "", pago: "", medio: "", clienta: "", total: 0, situacion: "pendiente", lineas: [] }; porNumero.set(numero, o); }
    // Las filas siguientes de la misma orden pueden venir con estos datos vacíos
    o.id ||= val(r, "id");
    o.f ||= fecha(val(r, "fechaPago")) || fecha(val(r, "fecha"));
    o.estado ||= val(r, "estado");
    o.pago ||= val(r, "pago");
    o.medio ||= val(r, "medio");
    o.clienta ||= val(r, "clienta");
    o.total ||= plata(val(r, "total"));
    const prod = val(r, "producto");
    if (!prod) continue;
    const v = variante(prod);
    const extra = val(r, "variante").split(/\s*[,/]\s*/).filter(Boolean);
    o.lineas.push({ nombre: v.nombre, valores: v.valores.length ? v.valores : extra, cant: Math.max(1, Math.round(plata(val(r, "cant")) || 1)), precio: plata(val(r, "precio")) });
  }
  const ordenes = [...porNumero.values()].map((o) => {
    const e = sinTildes(o.estado), p = sinTildes(o.pago);
    const situacion: OrdenCSV["situacion"] = /cancel/.test(e) || /cancel/.test(p) ? "cancelada"
      : /recibid|pagad|aprobad|acreditad|paid|^pago$|confirmad/.test(p) || idx.pago < 0 ? "recibida" : "pendiente";
    return { ...o, situacion };
  });
  return { ordenes: ordenes.sort((a, b) => (a.f < b.f ? 1 : a.f > b.f ? -1 : Number(b.numero) - Number(a.numero))), columnas: todas[0] };
}
