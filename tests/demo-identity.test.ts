import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_DRIVE } from "../lib/config";
import { HOJA_VIVA, T26_HOJA } from "../lib/data";
import { demoData, demoWorkbook, demoWorkbooks } from "../lib/demo";
import { CANALES, colorCanal, grupoCanal } from "../lib/fmt";

test("the public demo uses the same masked locations in sheets, channels and stock", () => {
  assert.deepEqual(CANALES, ["Rosario", "Mendoza", "Online", "Otros canales"]);
  assert.deepEqual(Object.keys(HOJA_VIVA), ["Rosario", "Online"]);
  assert.equal(HOJA_VIVA.Rosario, "Vivo Rosario");
  assert.equal(T26_HOJA, "STOCK ROSARIO");
  assert.equal(DEMO_DRIVE.tabs["demo-ventas"]["Vivo Rosario"], 1655492539);
  assert.equal(DEMO_DRIVE.tabs["demo-conteo"]["STOCK ROSARIO"], 1155295784);
  for (const channel of CANALES) assert.equal(grupoCanal(channel), channel);
  assert.equal(colorCanal("Rosario"), "var(--s1)");
  assert.equal(colorCanal("Mendoza"), "var(--s2)");

  const data = demoData();
  assert.deepEqual(new Set(data.ventas.map(sale => sale.canal)), new Set(CANALES));
  assert.deepEqual(new Set(data.stock.map(row => row.local)), new Set(["Rosario", "Mendoza", "Depósito"]));
  const master = demoWorkbook("demo-ventas")!.sheets;
  assert.deepEqual(Object.keys(master), ["Todos", "Vivo Rosario", "Vivo Online"]);
  assert.ok(master.Todos.slice(1).filter(row => row[2] === "Rosario").every(row => row[8] === "Registro Rosario"));
  assert.doesNotMatch(JSON.stringify(demoWorkbooks()), /benve|honduras|san\s*isidro|anita|claude|codex/i);
});

test("changing the demo identity preserves its previously published sales and stock quantities", () => {
  const data = demoData();
  assert.equal(data.ventas.length, 2604);
  assert.equal(data.ventas.reduce((sum, sale) => sum + sale.monto, 0), 571422702);
  const october = data.ventas.filter(sale => sale.f.startsWith("2026-10"));
  assert.equal(october.length, 65);
  assert.equal(october.reduce((sum, sale) => sum + sale.prendas, 0), 87);
  assert.equal(october.reduce((sum, sale) => sum + sale.monto, 0), 16228031);
  assert.deepEqual(Object.fromEntries(["Rosario", "Depósito", "Mendoza"].map(local => [
    local, data.stock.filter(row => row.local === local).reduce((sum, row) => sum + row.stock, 0),
  ])), { Rosario: 1018, "Depósito": 1023, Mendoza: 1023 });
});
