import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readPublicDemoFile } from "../server/dashboard.ts";

const config = JSON.parse(
  await readFile(
    new URL("../config/drive-source.json", import.meta.url),
    "utf8",
  ),
);
const dataset = await readPublicDemoFile(
  process.env.DEMO_DRIVE_FILE_ID || config.fileId,
);
const destination = fileURLToPath(
  new URL("../src/data/demo.json", import.meta.url),
);
await writeFile(destination, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
console.log(
  `Copia de demostración actualizada: ${dataset.sales.length} ventas ficticias.`,
);
