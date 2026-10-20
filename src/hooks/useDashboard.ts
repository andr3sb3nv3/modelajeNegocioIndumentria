import { useCallback, useEffect, useRef, useState } from "react";
import bundled from "../data/demo.json";
import { parseDataset } from "../lib/schema";
import type { DataResponse, Dataset } from "../lib/types";

const initialDataset = parseDataset(bundled);

function parseResponse(input: unknown): DataResponse {
  if (!input || typeof input !== "object")
    throw new Error("Invalid data response");
  const value = input as Record<string, unknown>;
  if (
    (value.source !== "drive" && value.source !== "bundled") ||
    typeof value.syncedAt !== "string" ||
    !Number.isFinite(Date.parse(value.syncedAt))
  ) {
    throw new Error("Invalid data response");
  }
  return {
    dataset: parseDataset(value.dataset),
    source: value.source,
    syncedAt: value.syncedAt,
  };
}

export function useDashboard() {
  const [dataset, setDataset] = useState<Dataset>(initialDataset);
  const [source, setSource] = useState<"drive" | "bundled">("bundled");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const requestId = useRef(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    setLoading(true);
    setError(null);
    fetch("/api/dashboard", {
      signal: controller.signal,
      cache: "no-cache",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("application/json")
        )
          throw new Error("Data unavailable");
        return parseResponse(await response.json());
      })
      .then((result) => {
        if (requestId.current !== id || controller.signal.aborted) return;
        setDataset(result.dataset);
        setSource(result.source);
      })
      .catch(() => {
        if (requestId.current === id)
          setError("Mostrando la última copia de demostración disponible.");
      })
      .finally(() => {
        clearTimeout(timeout);
        if (requestId.current === id) setLoading(false);
      });
    return () => {
      requestId.current++;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [version]);

  return { dataset, source, loading, error, refresh };
}
