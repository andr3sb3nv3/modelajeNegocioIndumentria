import type { IncomingMessage, ServerResponse } from "node:http";
import { loadDashboard } from "../server/dashboard.js";

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    response.statusCode = 405;
    response.end(JSON.stringify({ error: "Método no permitido." }));
    return;
  }
  try {
    const result = await loadDashboard();
    response.setHeader(
      "Cache-Control",
      result.source === "drive"
        ? "public, max-age=0, s-maxage=300, stale-while-revalidate=600"
        : "public, max-age=0, s-maxage=30",
    );
    response.statusCode = 200;
    response.end(
      request.method === "HEAD" ? undefined : JSON.stringify(result),
    );
  } catch {
    response.statusCode = 503;
    response.setHeader("Cache-Control", "no-store");
    response.end(
      request.method === "HEAD"
        ? undefined
        : JSON.stringify({
            error: "Los datos de demostración no están disponibles.",
          }),
    );
  }
}
