import test from "node:test";
import assert from "node:assert/strict";
import { parseDemoCsv, demoNumber } from "../lib/demo-csv";
import { validateDemoSnapshot, getDemoWorkbook } from "../lib/demo-source";
import { demoWorkbooks } from "../lib/demo";
import { DEMO_DRIVE } from "../lib/config";
import { ventasPlanilla } from "../lib/data";

test("CSV preserves source row positions, quotes, commas, line breaks and Argentine decimals", () => {
  assert.deepEqual(parseDemoCsv('\uFEFFTítulo,,\r\n,,\r\nFecha,Modelo,Importe\r\n2026-10-20,"Vestido, demo","1200,50"\r\n"Dos\n líneas","Con ""comillas""",0\r\n'), [
    ["Título", "", ""], ["", "", ""], ["Fecha", "Modelo", "Importe"],
    ["2026-10-20", "Vestido, demo", 1200.5], ["Dos\n líneas", 'Con "comillas"', 0],
  ]);
  assert.deepEqual(parseDemoCsv('001,2026-10,20/10/2026,-5,48.,"2,4"'), [["001", "2026-10", "20/10/2026", -5, 48, 2.4]]);
  assert.deepEqual(parseDemoCsv(""), []);
  assert.throws(() => parseDemoCsv('"incompleto'), /incompleto/);
  assert.throws(() => parseDemoCsv("x".repeat(3001)), /límites/);
});

test("formatted es_AR currency preserves magnitude and cents", () => {
  assert.equal(demoNumber("187.000"), 187000);
  assert.equal(demoNumber("187.000,00"), 187000);
  assert.equal(demoNumber("$ 1.234,50"), 1234.5);
  assert.equal(demoNumber("ARS -1.234.567,89"), -1234567.89);
  assert.equal(demoNumber("1436000,"), 1436000);
  assert.equal(demoNumber("2,4"), 2.4);
  assert.equal(demoNumber("001"), null);
  assert.equal(demoNumber("2026-10-20"), null);
});

test("snapshot accepts only the complete explicitly fictitious library", () => {
  const valid = { schemaVersion: 2, demo: true, asOf: DEMO_DRIVE.asOf, books: demoWorkbooks() };
  assert.equal(validateDemoSnapshot(valid).books.length, 17);
  assert.throws(() => validateDemoSnapshot({ ...valid, demo: false }));
  assert.throws(() => validateDemoSnapshot({ ...valid, books: valid.books.slice(1) }));
  const wrong = structuredClone(valid); wrong.books[0].id = "unrelated-real-sheet";
  assert.throws(() => validateDemoSnapshot(wrong));
  const duplicate = structuredClone(valid); duplicate.books[1].id = duplicate.books[0].id;
  assert.throws(() => validateDemoSnapshot(duplicate));
});

test("an unrelated sheet ID is rejected before any network request", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("Must not fetch"); };
  try {
    await assert.rejects(() => getDemoWorkbook("unrelated-real-sheet"), /no pertenece/);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});

test("future requested sales accept both public CSV dates and numeric sheet dates", () => {
  const row = (date: string | number) => [date, "Clienta Demo 001", "", 2, 50000, "", "", "Transferencia", "", "Cedro"];
  const sales = ventasPlanilla([row("2026-10-20"), row(46315), row("20/10/26"), row("FECHA")], "San Isidro", 9);
  assert.equal(sales.length, 3);
  assert.equal(sales[2].f, "2026-10-20");
  assert.equal(sales[0].f, "2026-10-20");
  assert.equal(sales[0].prendas, 2);
  assert.equal(sales[0].monto, 50000);
  assert.equal(sales[0].modelo, "Cedro");
});
