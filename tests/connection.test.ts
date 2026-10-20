import assert from "node:assert/strict";
import { test } from "node:test";
import type { IncomingMessage, ServerResponse } from "node:http";
import bundled from "../src/data/demo.json";
import { loadDashboard, readPublicDemoFile } from "../server/dashboard";
import handler from "../api/dashboard";

const fileId = "demo_public_file_12345";
const jsonResponse = (input: unknown) =>
  new Response(JSON.stringify(input), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });

test("Drive loader requests only the configured public file and accepts a validated demo", async () => {
  let requestedUrl = "";
  const fetchImpl: typeof fetch = async (url, init) => {
    requestedUrl = String(url);
    assert.equal(init?.redirect, "follow");
    assert.ok(init?.signal);
    return jsonResponse(bundled);
  };
  const result = await loadDashboard({ fileId, fetchImpl });
  assert.equal(
    requestedUrl,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
  );
  assert.equal(result.source, "drive");
  assert.equal(result.dataset.demo, true);
  assert.equal(result.dataset.company, bundled.company);
  assert.ok(Number.isFinite(Date.parse(result.syncedAt)));
});

test("Drive network failures use the bundled fictitious dataset without returning raw errors", async () => {
  const result = await loadDashboard({
    fileId,
    fetchImpl: async () => {
      throw new Error("private provider error with credential");
    },
  });
  assert.equal(result.source, "bundled");
  assert.deepEqual(result.dataset, bundled);
  assert.ok(result.warning);
  assert.ok(!JSON.stringify(result).includes("credential"));
});

test("Drive raw JSON attachment octet-stream is accepted only after full dataset validation", async () => {
  const response = await readPublicDemoFile(fileId, {
    fetchImpl: async () =>
      new Response(JSON.stringify(bundled), {
        headers: {
          "content-type": "application/octet-stream",
          "content-disposition": 'attachment; filename="dashboard-demo.json"',
        },
      }),
  });
  assert.deepEqual(response, bundled);
  await assert.rejects(
    readPublicDemoFile(fileId, {
      fetchImpl: async () =>
        new Response("<html>Not a dataset</html>", {
          headers: { "content-type": "application/octet-stream" },
        }),
    }),
  );
});

test("Drive loader rejects non-demo data and does not use it as fallback", async () => {
  const unsafe = { ...bundled, demo: false, company: "Private real company" };
  await assert.rejects(
    readPublicDemoFile(fileId, { fetchImpl: async () => jsonResponse(unsafe) }),
  );
  const result = await loadDashboard({
    fileId,
    fetchImpl: async () => jsonResponse(unsafe),
  });
  assert.equal(result.source, "bundled");
  assert.equal(result.dataset.company, bundled.company);
});

test("Drive login or permission HTML is rejected rather than treated as dashboard data", async () => {
  await assert.rejects(
    readPublicDemoFile(fileId, {
      fetchImpl: async () =>
        new Response("<html>Sign in</html>", {
          headers: { "content-type": "text/html" },
        }),
    }),
  );
  await assert.rejects(
    readPublicDemoFile(fileId, {
      fetchImpl: async () =>
        new Response("forbidden", {
          status: 403,
          headers: { "content-type": "text/plain" },
        }),
    }),
  );
});

test("Invalid IDs cannot alter the Google Drive URL or initiate a request", async () => {
  let calls = 0;
  await assert.rejects(
    readPublicDemoFile("https://other.example/private", {
      fetchImpl: async () => {
        calls++;
        return jsonResponse(bundled);
      },
    }),
  );
  assert.equal(calls, 0);
});

test("Oversized response headers and streams are rejected before parsing", async () => {
  await assert.rejects(
    readPublicDemoFile(fileId, {
      maxBytes: 30,
      fetchImpl: async () =>
        new Response("{}", {
          headers: {
            "content-type": "application/json",
            "content-length": "1000",
          },
        }),
    }),
    /size limit/,
  );
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(31));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    readPublicDemoFile(fileId, {
      maxBytes: 30,
      fetchImpl: async () =>
        new Response(body, { headers: { "content-type": "application/json" } }),
    }),
    /size limit/,
  );
  assert.equal(cancelled, true);
});

test("Slow sources time out and abort the in-flight request", async () => {
  let signal: AbortSignal | null | undefined;
  const fetchImpl: typeof fetch = async (_, init) => {
    signal = init?.signal;
    return new Promise<Response>((_, reject) =>
      signal?.addEventListener("abort", () => reject(new Error("aborted")), {
        once: true,
      }),
    );
  };
  await assert.rejects(
    readPublicDemoFile(fileId, { fetchImpl, timeoutMs: 10 }),
  );
  assert.equal(signal?.aborted, true);
});

function fakeResponse() {
  const headers = new Map<string, string | number | readonly string[]>();
  let body: string | undefined;
  const response = {
    statusCode: 0,
    setHeader(key: string, value: string | number | readonly string[]) {
      headers.set(key.toLowerCase(), value);
    },
    end(value?: string) {
      body = value;
    },
  };
  return {
    response: response as unknown as ServerResponse,
    headers,
    get body() {
      return body;
    },
  };
}

test("API rejects writes and returns a read-only Allow header", async () => {
  const result = fakeResponse();
  await handler({ method: "POST" } as IncomingMessage, result.response);
  assert.equal(result.response.statusCode, 405);
  assert.equal(result.headers.get("allow"), "GET, HEAD");
  assert.deepEqual(JSON.parse(result.body!), { error: "Método no permitido." });
});

test("API GET fallback returns JSON while HEAD returns no body", async () => {
  const previous = process.env.DEMO_DRIVE_FILE_ID;
  process.env.DEMO_DRIVE_FILE_ID = "invalid";
  try {
    const get = fakeResponse();
    await handler({ method: "GET" } as IncomingMessage, get.response);
    assert.equal(get.response.statusCode, 200);
    assert.match(String(get.headers.get("content-type")), /application\/json/);
    assert.equal(JSON.parse(get.body!).source, "bundled");
    assert.equal(JSON.parse(get.body!).dataset.demo, true);
    const head = fakeResponse();
    await handler({ method: "HEAD" } as IncomingMessage, head.response);
    assert.equal(head.response.statusCode, 200);
    assert.equal(head.body, undefined);
  } finally {
    if (previous === undefined) delete process.env.DEMO_DRIVE_FILE_ID;
    else process.env.DEMO_DRIVE_FILE_ID = previous;
  }
});
