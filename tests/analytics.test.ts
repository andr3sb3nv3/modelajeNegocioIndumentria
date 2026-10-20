import test from "node:test";
import assert from "node:assert/strict";
import rawDemo from "../src/data/demo.json";
import {
  exportCSV,
  getDateRange,
  getFilteredExpenses,
  getFilteredSales,
  getSummary,
  saleCost,
  saleRevenue,
} from "../src/lib/analytics";
import { parseDataset } from "../src/lib/schema";
import type { Dataset, Filters } from "../src/lib/types";

const demo = parseDataset(rawDemo);
const all: Filters = { period: "month", channel: "Todos los canales" };
const fixture: Dataset = {
  schemaVersion: 1,
  demo: true,
  updatedAt: "2026-10-20T15:00:00.000Z",
  company: "Marca ficticia",
  currency: "ARS",
  products: [
    {
      id: "p1",
      name: "Camisa",
      sku: "CAM-01",
      category: "Camisas",
      price: 100,
      cost: 40,
      stock: 5,
      minStock: 10,
      color: "#ffffff",
    },
  ],
  sales: [
    {
      id: "s1",
      date: "2026-10-10",
      productId: "p1",
      channel: "Tienda online",
      units: 2,
      unitPrice: 100,
      unitCost: 40,
      discount: 0.1,
    },
    {
      id: "s2",
      date: "2026-10-11",
      productId: "p1",
      channel: "Showroom",
      units: 1,
      unitPrice: 200,
      unitCost: 80,
      discount: 0,
    },
    {
      id: "s3",
      date: "2026-09-10",
      productId: "p1",
      channel: "Tienda online",
      units: 2,
      unitPrice: 100,
      unitCost: 40,
      discount: 0,
    },
    {
      id: "s4",
      date: "2025-10-10",
      productId: "p1",
      channel: "Mayorista",
      units: 3,
      unitPrice: 80,
      unitCost: 30,
      discount: 0,
    },
  ],
  expenses: [
    { id: "e1", date: "2026-10-05", category: "Alquiler", amount: 100 },
    { id: "e2", date: "2026-09-05", category: "Alquiler", amount: 80 },
  ],
  production: [],
};

test("demo data validates and contains only the explicit demonstration schema", () => {
  assert.equal(demo.demo, true);
  assert.equal(demo.products.length, 12);
  assert.equal(demo.sales.length, 264);
  assert.equal(demo.company, "Lino Studio");
  assert.deepEqual(
    [...new Set(demo.sales.map((sale) => sale.channel))].sort(),
    ["Mayorista", "Showroom", "Tienda online"],
  );
});

test("calendar windows stay anchored to the dataset and compare like calendar periods", () => {
  assert.deepEqual(getDateRange(demo, "month"), {
    start: "2026-10-01",
    end: "2026-10-31",
    previousStart: "2026-09-01",
    previousEnd: "2026-09-30",
    label: "Octubre 2026",
  });
  const quarter = getDateRange(demo, "quarter");
  assert.equal(quarter.start, "2026-08-01");
  assert.equal(quarter.previousStart, "2026-05-01");
  assert.equal(quarter.previousEnd, "2026-07-31");
  const year = getDateRange(demo, "year");
  assert.equal(year.start, "2026-01-01");
  assert.equal(year.previousStart, "2025-01-01");
  assert.equal(year.previousEnd, "2025-10-31");
});

test("net revenue, cost, gross profit and operating profit reconcile", () => {
  const summary = getSummary(fixture, all);
  assert.equal(summary.revenue, 380);
  assert.equal(summary.units, 3);
  assert.equal(summary.grossProfit, 220);
  assert.equal(summary.grossMargin, 220 / 380);
  assert.equal(summary.expenses, 100);
  assert.equal(summary.operatingProfit, 120);
  assert.equal(summary.operatingMargin, 120 / 380);
  assert.equal(summary.averageTicket, 126.67); // Per garment, since rows are not orders.
  assert.equal(summary.previousRevenue, 200);
  assert.equal(summary.revenueChange, 0.9);
  assert.equal(summary.unitsChange, 0.5);
  assert.equal(summary.topProducts[0].revenue, 380);
  assert.equal(
    summary.channels.reduce((total, item) => total + item.value, 0),
    380,
  );
  assert.equal(summary.categories[0].value, 380);
  assert.equal(summary.monthly[0].profit, 120);
  assert.equal(summary.lowStock.length, 1);
});

test("channel filters include only matching sales and allocate operating expenses by revenue", () => {
  const filters: Filters = { ...all, channel: "Tienda online" };
  assert.deepEqual(
    getFilteredSales(fixture, filters).map((sale) => sale.id),
    ["s1"],
  );
  assert.equal(getFilteredExpenses(fixture, filters)[0].amount, 47.37);
  const summary = getSummary(fixture, filters);
  assert.equal(summary.revenue, 180);
  assert.equal(summary.expenses, 47.37);
  assert.equal(summary.operatingProfit, 52.63);
  assert.equal(summary.channels.length, 1);
});

test("replenishment includes stock exactly at its minimum threshold", () => {
  const data = structuredClone(fixture);
  data.products[0].stock = data.products[0].minStock;
  assert.deepEqual(
    getSummary(data, all).lowStock.map((product) => product.id),
    ["p1"],
  );
  data.products[0].stock += 1;
  assert.deepEqual(getSummary(data, all).lowStock, []);
});

test("all periods and channels reconcile time-series totals against headline metrics", () => {
  for (const period of ["month", "quarter", "year"] as const) {
    for (const channel of [
      "Todos los canales",
      "Tienda online",
      "Showroom",
      "Mayorista",
    ] as const) {
      const filters = { period, channel };
      const summary = getSummary(demo, filters);
      const sales = getFilteredSales(demo, filters);
      const expectedRevenue = sales.reduce(
        (total, sale) => total + saleRevenue(sale),
        0,
      );
      const expectedCost = sales.reduce(
        (total, sale) => total + saleCost(sale),
        0,
      );
      assert.ok(Math.abs(summary.revenue - expectedRevenue) < 0.01);
      assert.ok(
        Math.abs(
          summary.operatingProfit -
            (expectedRevenue - expectedCost - summary.expenses),
        ) < 0.02,
      );
      assert.ok(
        Math.abs(
          summary.monthly.reduce((total, month) => total + month.revenue, 0) -
            summary.revenue,
        ) < 0.01,
      );
      assert.ok(
        Math.abs(
          summary.monthly.reduce((total, month) => total + month.profit, 0) -
            summary.operatingProfit,
        ) < 0.02,
      );
      assert.equal(
        summary.topProducts.reduce(
          (total, product) => total + product.units,
          0,
        ),
        summary.units,
      );
    }
  }
});

test("an empty channel gives finite zero metrics instead of NaN or Infinity", () => {
  const summary = getSummary(fixture, { ...all, channel: "Mayorista" });
  for (const key of [
    "revenue",
    "expenses",
    "grossMargin",
    "operatingMargin",
    "revenueChange",
    "averageTicket",
    "ticketChange",
  ] as const) {
    assert.equal(summary[key], 0);
  }
});

test("schema rejects real-data flags, unknown fields, invalid dates, duplicate IDs and missing product references", () => {
  assert.throws(() => parseDataset({ ...fixture, demo: false }));
  assert.throws(() =>
    parseDataset({ ...fixture, privateNotes: "not part of the public format" }),
  );
  assert.throws(() =>
    parseDataset({
      ...fixture,
      sales: [{ ...fixture.sales[0], date: "2026-02-31" }],
    }),
  );
  assert.throws(() =>
    parseDataset({
      ...fixture,
      sales: [{ ...fixture.sales[0], date: "2026-10-21" }],
    }),
  );
  assert.throws(() =>
    parseDataset({ ...fixture, sales: [fixture.sales[0], fixture.sales[0]] }),
  );
  assert.throws(() =>
    parseDataset({
      ...fixture,
      sales: [{ ...fixture.sales[0], productId: "missing" }],
    }),
  );
  assert.throws(() =>
    parseDataset({ ...fixture, sales: [{ ...fixture.sales[0], discount: 5 }] }),
  );
  assert.throws(() =>
    parseDataset({
      ...fixture,
      products: [{ ...fixture.products[0], color: "url(https://example.com)" }],
    }),
  );
});

test("CSV follows filters, quotes separators and protects spreadsheet formula cells", () => {
  const data = structuredClone(fixture);
  data.products[0].name = '=SUM(1;2) "especial"';
  const csv = exportCSV(data, { ...all, channel: "Tienda online" });
  assert.ok(csv.startsWith('\uFEFF"ID";"Fecha";'));
  assert.ok(csv.includes('"\'=SUM(1;2) ""especial"""'));
  assert.ok(csv.includes('"s1"'));
  assert.ok(!csv.includes('"s2"'));
  assert.ok(!csv.includes('"s3"'));
  assert.equal(csv.split("\r\n").filter(Boolean).length, 2);
});
