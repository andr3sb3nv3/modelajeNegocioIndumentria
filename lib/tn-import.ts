import "server-only";
import { getData } from "./data";
import { REF_TN, leerMovimientos, reconocer, stockEnVivo, vigentes } from "./stock";
import { CONSULTA } from "./demo-store";
import { USUARIO_TN } from "./sync";
import { leerCSV, type OrdenCSV } from "./tn-csv";

/**
 * Carga manual de las ventas de Tiendanube: el archivo de «Ventas › Exportar lista» entra a la hoja Movimientos,
 * igual que las ventas del local, como ventas del local online. Una vez por orden (ref «tn:#<número>»):
 * subir el mismo archivo dos veces, o uno que se pisa con el anterior, no duplica nada.
 */
export type Accion = "nueva" | "ya" | "anular" | "nada";
export type OrdenVista = Omit<OrdenCSV, "lineas"> & {
  accion: Accion;
  lineas: { nombre: string; valores: string[]; cant: number; precio: number; modelo: string; color: string; talle: string; ok: boolean }[];
};
export type Vista = { ordenes: OrdenVista[]; local: string; error?: string; columnas?: string[] };

export const refDe = (numero: string) => `${REF_TN}#${numero}`;

async function armar(texto: string) {
  const l = leerCSV(texto);
  if (l.error) return { vista: { ordenes: [], local: "", error: l.error, columnas: l.columnas } as Vista, movs: [] };
  const { movs, error } = await leerMovimientos(true);
  if (error) throw new Error(error);
  const s = await stockEnVivo((await getData()).stock);
  const quien = reconocer(s.items);
  const vivas = vigentes(movs).filter((m) => m.tipo === "venta" && m.ref.startsWith(REF_TN));
  const refs = (o: OrdenCSV) => [refDe(o.numero), ...(o.id ? [REF_TN + o.id] : [])];
  const ordenes: OrdenVista[] = l.ordenes.map((o) => {
    const rs = refs(o);
    const entro = movs.some((m) => rs.includes(m.ref)); // aunque después se haya anulado: no se vuelve a cargar
    const viva = vivas.some((m) => rs.includes(m.ref));
    const accion: Accion = o.situacion === "recibida" ? (entro ? "ya" : "nueva") : o.situacion === "cancelada" && viva ? "anular" : "nada";
    return { ...o, accion, lineas: o.lineas.map((x) => ({ ...x, ...quien(x.nombre, x.valores) })) };
  });
  return { vista: { ordenes, local: s.online.local } as Vista, movs: vivas };
}

export async function previsualizar(texto: string): Promise<Vista> {
  return (await armar(texto)).vista;
}

export async function importar(_texto: string, _quienCarga: string) {
  return { cargadas: 0, anuladas: 0, nuevos: [], error: CONSULTA };
}
