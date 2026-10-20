import type { Gasto } from "./data";

/**
 * Rubros de gastos, iguales a la hoja «Resumen Anual» de la marca demo · Gastos (mismo orden y mismos grupos).
 * Cada rubro junta categorías o subcategorías de la pestaña Gastos, como las fórmulas de esa hoja.
 * Única diferencia a propósito: «Otros › Moldería / Desarrollo» va a «Moldería y muestras»
 * (la hoja busca la categoría «Moldería», que nadie usa, y esos gastos le quedan en «Otros gastos»).
 * Un gasto sin categoría o con una categoría nueva que no está acá queda en «Sin rubro», para verlo y completarlo.
 */
export const GRUPOS_RUBRO = ["Costo de producción", "Gastos comerciales", "Estructura"] as const;
export type GrupoRubro = (typeof GRUPOS_RUBRO)[number] | "Sin rubro";

export const SIN_RUBRO = "Sin rubro";

export const RUBROS: { r: string; g: GrupoRubro; d: string }[] = [
  { r: "Talleres y confección", g: "Costo de producción", d: "Subcategoría Confección / Taller." },
  { r: "Telas", g: "Costo de producción", d: "Categoría Telas." },
  { r: "Moldería y muestras", g: "Costo de producción", d: "Categoría Moldería y subcategoría Moldería / Desarrollo." },
  { r: "Mercería y avíos", g: "Costo de producción", d: "Categorías Mercería y Cierres." },
  { r: "Marketing y contenido", g: "Gastos comerciales", d: "Categorías Campaña, Fotos y Modelo." },
  { r: "Pauta y agencia", g: "Gastos comerciales", d: "Categoría Publicidad." },
  { r: "Packaging", g: "Gastos comerciales", d: "Categoría Packaging." },
  { r: "Envíos y logística", g: "Gastos comerciales", d: "Categoría Logística / Envíos." },
  { r: "Plataformas y web", g: "Gastos comerciales", d: "Subcategorías Plataforma online - Web y Plataforma online - costo transacción." },
  { r: "Sueldos y personal", g: "Estructura", d: "Categoría Sueldos, menos Sueldo Dirección." },
  { r: "Dirección", g: "Estructura", d: "Subcategoría Sueldo Dirección." },
  { r: "Alquiler y expensas", g: "Estructura", d: "Categoría Alquileres y subcategoría Expensas showroom Mendoza." },
  { r: "Impuestos", g: "Estructura", d: "Categoría Impuestos." },
  { r: "Otros gastos", g: "Estructura", d: "Lo que queda en la categoría Otros después de sacar talleres y moldería. Abajo, uno por uno." },
];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const POR_SUB: Record<string, string> = {
  "confeccion / taller": "Talleres y confección",
  "molderia / desarrollo": "Moldería y muestras",
  "plataforma online - web": "Plataformas y web",
  "plataforma online - costo transaccion": "Plataformas y web",
  "sueldo direccion": "Dirección",
  "expensas showroom mendoza": "Alquiler y expensas",
};
const POR_CAT: Record<string, string> = {
  telas: "Telas", molderia: "Moldería y muestras", merceria: "Mercería y avíos", cierres: "Mercería y avíos",
  campana: "Marketing y contenido", fotos: "Marketing y contenido", modelo: "Marketing y contenido",
  publicidad: "Pauta y agencia", packaging: "Packaging", "logistica / envios": "Envíos y logística",
  sueldos: "Sueldos y personal", alquileres: "Alquiler y expensas", impuestos: "Impuestos", otros: "Otros gastos",
};

export function rubroDe(g: Pick<Gasto, "cat" | "sub">): string {
  return POR_SUB[norm(g.sub || "")] || POR_CAT[norm(g.cat)] || SIN_RUBRO;
}

export const grupoDe = (rubro: string): GrupoRubro => RUBROS.find((x) => x.r === rubro)?.g || "Sin rubro";
