import test from "node:test";
import assert from "node:assert/strict";
import { CONSULTA, demoSheetsCall, parseDemoRange } from "../lib/demo-store";
import { agregarFilas, asegurarHoja, call, escribirFormula } from "../lib/sheets-write";
import { borrarFilas, guardarMovimientos } from "../lib/stock";
import { guardarNotas } from "../lib/linea";
import { cargarGastoVoz } from "../lib/gasto-voz";
import { tnConfig, tnFetch, ventasOnline } from "../lib/tiendanube";
import { POST as expensePost } from "../app/api/gasto/route";
import { POST as resetPost } from "../app/api/demo/reset/route";
import { POST as webhookPost } from "../app/api/tiendanube/webhook/route";

test("A1 ranges keep column and row boundaries and quoted sheet names", () => {
  assert.deepEqual(parseDemoRange("'Movimientos'!A2:O"), { sheet: "Movimientos", r: 1, c: 0, endR: undefined, endC: 15 });
  assert.deepEqual(parseDemoRange("'Días'!D8:G14"), { sheet: "Días", r: 7, c: 3, endR: 14, endC: 7 });
  assert.deepEqual(parseDemoRange("'Equipo''s demo'!C3"), { sheet: "Equipo's demo", r: 2, c: 2, endR: 3, endC: 3 });
  assert.throws(() => parseDemoRange("A1"));
  assert.throws(() => parseDemoRange("'Stock'!A0:B1"));
});

test("all low-level write entrypoints reject without contacting Google", async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error("Must not fetch"); };
  try {
    await assert.rejects(() => call("https://sheets.googleapis.com/v4/spreadsheets/demo-stock/values/Stock!A1", { method: "PUT", body: '{}' }), { message: CONSULTA });
    await assert.rejects(() => demoSheetsCall("https://sheets.googleapis.com/v4/spreadsheets/demo-stock:batchUpdate", { method: "POST", body: '{}' }), { message: CONSULTA });
    await assert.rejects(() => agregarFilas("demo-stock", "Movimientos", [], []), { message: CONSULTA });
    await assert.rejects(() => asegurarHoja("demo-stock", "New", []), { message: CONSULTA });
    await assert.rejects(() => escribirFormula("demo-stock", "New", "=IMPORTRANGE()"), { message: CONSULTA });
    assert.equal(requests, 0);
  } finally { globalThis.fetch = original; }
});

test("sales, deletion, notes and expenses cannot change this consultation app", async () => {
  await assert.rejects(() => guardarMovimientos([], "demo"), { message: CONSULTA });
  await assert.rejects(() => borrarFilas(["test"]), { message: CONSULTA });
  await assert.rejects(() => guardarNotas("2026-10-20", "Demo", [{ hora: "10:00", que: "Test" }]), { message: CONSULTA });
  const expense = await cargarGastoVoz({ que: "Test", cuanto: 100 });
  assert.equal(expense.ok, false);
  assert.equal(expense.mensaje, CONSULTA);
});

test("legacy mutation APIs return 405 and never set visitor cookies", async () => {
  for (const handler of [expensePost, resetPost, webhookPost]) {
    const response = await handler();
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal((await response.json()).error, CONSULTA);
  }
});

test("storefront credentials cannot activate a real Tiendanube connection", async () => {
  const previous = process.env.TIENDANUBE_ACCESS_TOKEN;
  process.env.TIENDANUBE_ACCESS_TOKEN = "test-ignored";
  try {
    assert.equal(tnConfig().lectura, false);
    assert.equal(tnConfig().token, undefined);
    assert.deepEqual(await ventasOnline("2026-01-01"), { activo: false, lineas: [] });
    await assert.rejects(() => tnFetch("/orders"), { message: CONSULTA });
  } finally {
    if (previous === undefined) delete process.env.TIENDANUBE_ACCESS_TOKEN;
    else process.env.TIENDANUBE_ACCESS_TOKEN = previous;
  }
});

test("the sheet adapter rejects unrelated origins before reading any data", async () => {
  await assert.rejects(() => demoSheetsCall("https://attacker.example/v4/spreadsheets/demo-stock/values/Stock!A1"), /sólo lee/);
});
