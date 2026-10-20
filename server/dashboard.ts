import bundled from "../src/data/demo.json" with { type: "json" };
import driveSource from "../config/drive-source.json" with { type: "json" };
import { parseDataset } from "../src/lib/schema.js";
import type { DataResponse, Dataset } from "../src/lib/types";

export const MAX_DEMO_BYTES = 512 * 1024;
const FILE_ID = /^[A-Za-z0-9_-]{10,200}$/;

type ReadOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
};

/** The only remote input is one explicitly selected public demo JSON file. */
export async function readPublicDemoFile(
  fileId: string,
  options: ReadOptions = {},
): Promise<Dataset> {
  if (!FILE_ID.test(fileId)) throw new Error("Invalid demo file ID");
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxBytes = options.maxBytes ?? MAX_DEMO_BYTES;
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const work = async () => {
    const response = await fetchImpl(
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json, text/plain;q=0.9" },
        redirect: "follow",
      },
    );
    if (!response.ok) throw new Error("Demo source unavailable");
    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    // Drive serves raw JSON attachments as octet-stream; parseDataset still validates every byte.
    if (
      contentType !== "application/json" &&
      contentType !== "text/plain" &&
      contentType !== "application/octet-stream"
    )
      throw new Error("Demo source is not JSON");
    const declaredLength = response.headers.get("content-length");
    if (declaredLength && Number(declaredLength) > maxBytes)
      throw new Error("Demo source exceeds size limit");
    if (!response.body) throw new Error("Empty demo source");

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > maxBytes)
          throw new Error("Demo source exceeds size limit");
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => undefined);
      throw error;
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return parseDataset(JSON.parse(json));
  };

  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("Demo source timed out"));
        }, options.timeoutMs ?? 5000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    controller.abort();
  }
}

export async function loadDashboard(
  options: ReadOptions & { fileId?: string } = {},
): Promise<DataResponse> {
  const fileId =
    options.fileId ?? process.env.DEMO_DRIVE_FILE_ID ?? driveSource.fileId;
  try {
    const dataset = await readPublicDemoFile(fileId, options);
    return { dataset, source: "drive", syncedAt: new Date().toISOString() };
  } catch {
    return {
      dataset: parseDataset(bundled),
      source: "bundled",
      syncedAt: new Date().toISOString(),
      warning: "Se está mostrando la copia de demostración incluida.",
    };
  }
}
