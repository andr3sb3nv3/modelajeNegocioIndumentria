import "server-only";
import { CONSULTA } from "./demo-store";

/** No account, token, webhook or production storefront is used by this application. */
export function tnConfig() { return { store: undefined, token: undefined, secret: undefined, lectura: false, webhooks: false }; }
export function estadoSync(): { on: boolean; texto: string } { return { on: false, texto: "Sin tienda conectada · aplicación de consulta" }; }
export async function tnFetch(_path: string, _init: RequestInit = {}): Promise<Response> { throw new Error(CONSULTA); }
export function hmacOk(_raw: string, _firma: string | null) { return false; }
export type Orden = {
  id: number; number: number; created_at: string; paid_at?: string | null; status: string; payment_status: string;
  products: { name: string; quantity: number | string; price?: string | number; variant_id?: number; variant_values?: string[] }[];
};
export type LineaTN = { id: string; orden: string; f: string; nombre: string; valores: string[]; cant: number; precio: number };
export type TN = { activo: boolean; lineas: LineaTN[]; error?: string };
export type VarTN = { producto: number; variante: number; nombre: string; valores: string[]; stock: number | null };
export const fechaOrden = (o: Orden) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(o.paid_at || o.created_at));
export const pagada = (o: Orden) => o.status !== "cancelled" && o.payment_status === "paid";
export const lineasDe = (o: Orden): LineaTN[] => o.products.map(p => ({ id: String(o.id), orden: `#${o.number}`, f: fechaOrden(o), nombre: p.name, valores: (p.variant_values || []).map(String), cant: Number(p.quantity) || 0, precio: Number(p.price) || 0 }));
export async function getOrden(_id: string | number): Promise<Orden> { throw new Error(CONSULTA); }
export async function ordenesDesde(_desde: string): Promise<Orden[]> { return []; }
export async function ventasOnline(_desde: string): Promise<TN> { return { activo: false, lineas: [] }; }
export async function variantes(): Promise<VarTN[]> { return []; }
export async function ponerStock(_variante: VarTN, _stock: number): Promise<void> { throw new Error(CONSULTA); }
