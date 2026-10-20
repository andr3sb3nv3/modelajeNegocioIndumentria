import { createHash } from "node:crypto";
import { DEMO_AS_OF } from "./config";

type Cell = string | number | boolean | null;
type SaleRow = readonly Cell[];

const COLORS = ["Azul niebla", "Coral suave", "Crudo", "Verde salvia"];
export const DEMO_ONLINE_USER = "Equipo Demo · Online";

/**
 * Mirrors the invented master sales in the detailed, read-only history.
 * Stock counts must be dated asOf: these historical sales are already included
 * in that closing inventory, so stockEnVivo must not subtract them again.
 */
export function demoSalesMovements(sales: readonly SaleRow[], asOf = DEMO_AS_OF): Cell[][] {
  const occurrences = new Map<string, number>();
  return sales.map(row => {
    const serial = Number(row[0]);
    const f = new Date((serial - 25569) * 86400000).toISOString().slice(0, 10);
    const channel = String(row[2]);
    const customer = String(row[3]);
    const model = String(row[4]);
    const quantity = Number(row[5]);
    const amount = Number(row[6]);
    const method = String(row[7]);
    if (!Number.isFinite(serial) || f > asOf || !customer || !model || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(amount) || amount <= 0) {
      throw new Error("La venta ficticia no es válida para el historial de demostración.");
    }
    const digest = createHash("sha256").update(JSON.stringify(row)).digest("hex");
    const repeated = (occurrences.get(digest) || 0) + 1;
    occurrences.set(digest, repeated);
    const id = `demo-venta-${digest.slice(0, 16)}-${repeated}`;
    const variant = Number.parseInt(digest.slice(0, 4), 16);
    // Online and the other channels dispatch from the fictitious depot.
    const local = channel === "San Isidro" || channel === "Honduras" ? channel : "Depósito";
    // Keep the sales channel separate from the physical dispatch location.
    const user = channel === "Online" ? DEMO_ONLINE_USER : "equipo.demo@example.com";
    const hour = String(10 + variant % 9).padStart(2, "0");
    const minute = String(Number.parseInt(digest.slice(4, 6), 16) % 60).padStart(2, "0");
    return [id, `${f} ${hour}:${minute}:00`, f, local, "Venta", model,
      COLORS[variant % COLORS.length], String(1 + (variant >>> 2) % 4),
      -quantity, amount, method, customer,
      `Venta ficticia · ${channel} · incluida en el conteo al ${asOf}`,
      `demo:${id}`, user];
  });
}
