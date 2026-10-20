import type { stockEnVivo } from "./stock";

type Vivo = Awaited<ReturnType<typeof stockEnVivo>>;

/**
 * Ventas de la hoja Ventas posteriores al último conteo que el stock en vivo descontó por modelo (no pasaron por «Vendí»
 * ni por la subida de Tiendanube; la hoja Ventas no tiene talle ni color). Sale de stockEnVivo(stock, ventas).
 */
export function vendidasSinDescontar(s: Vivo) {
  const porModelo = new Map<string, number>();
  for (const x of s.sinTalle) porModelo.set(x.k, (porModelo.get(x.k) || 0) + x.vendidas);
  const desde = [...s.ult.values()].sort()[0] || "";
  return { porModelo, total: s.sinTalle.reduce((a, x) => a + x.vendidas, 0), desde };
}
