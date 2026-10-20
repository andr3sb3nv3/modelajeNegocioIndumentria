export type Rol = "admin" | "vendedora";
/** No real identities are read: every public visitor explores the full demo. */
export function rolDe(_email?: string | null): Rol { return "admin"; }
export const RUTAS_VENDEDORA = ["/stock", "/ventas"];
export const puedeVer = (rol: Rol, path: string) => rol === "admin" || RUTAS_VENDEDORA.some(r => path === r || path.startsWith(r + "/"));
