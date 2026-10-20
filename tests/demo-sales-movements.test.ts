import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_ONLINE_USER, demoSalesMovements } from "../lib/demo-sales-movements";
import { DEMO_AS_OF, demoWorkbook } from "../lib/demo";

test("detailed demo history mirrors master sales without changing closing stock", () => {
  const sales = demoWorkbook("demo-ventas")!.sheets.Todos.slice(1);
  const movements = demoSalesMovements(sales);
  assert.ok(sales.length > 0);
  assert.equal(movements.length, sales.length);
  assert.equal(new Set(movements.map(row => row[0])).size, sales.length);
  assert.equal(movements.reduce((sum, row) => sum + Number(row[9]), 0), sales.reduce((sum, row) => sum + Number(row[6]), 0));
  assert.equal(movements.reduce((sum, row) => sum - Number(row[8]), 0), sales.reduce((sum, row) => sum + Number(row[5]), 0));
  const counts = demoWorkbook("demo-stock")!.sheets.Stock.slice(1);
  const countDate = new Map(counts.map(row => [String(row[1]), new Date((Number(row[0]) - 25569) * 86400000).toISOString().slice(0, 10)]));
  for (const row of movements) {
    assert.equal(row.length, 15);
    assert.ok(String(row[2]) <= DEMO_AS_OF);
    assert.ok(String(row[2]) <= countDate.get(String(row[3]))!, "historical sale is already included in its local closing inventory");
    assert.ok(counts.some(count => count[1] === row[3] && count[2] === row[5] && count[3] === row[6] && String(count[4]) === row[7]));
    assert.match(String(row[12]), /ficticia/);
    assert.match(String(row[13]), /^demo:/);
  }
  assert.deepEqual(demoSalesMovements(sales), movements);
  const onlineSales = sales.filter(row => row[2] === "Online");
  const onlineMovements = movements.filter(row => row[14] === DEMO_ONLINE_USER);
  assert.equal(onlineMovements.length, onlineSales.length);
  assert.ok(onlineMovements.every(row => row[3] === "Depósito"));
  assert.equal(onlineMovements.reduce((sum, row) => sum + Number(row[9]), 0), onlineSales.reduce((sum, row) => sum + Number(row[6]), 0));
  assert.ok(movements.every(row => row[14] !== "Tiendanube"));
});

test("identical invented sales remain separate history operations", () => {
  const date = Date.parse(`${DEMO_AS_OF}T00:00:00Z`) / 86400000 + 25569;
  const row = [date, DEMO_AS_OF.slice(0, 7), "Rosario", "Clienta Demo 001", "Aurora", 1, 187000, "Transferencia", "Registro Rosario", "Ficticio"];
  const movements = demoSalesMovements([row, row]);
  assert.notEqual(movements[0][0], movements[1][0]);
  assert.equal(movements[0][8], -1);
  assert.equal(movements[0][9], 187000);
});
