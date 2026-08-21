/**
 * IQtesting collection endpoint (Cloudflare Worker).
 *
 * POST /api/submit  — body: one ExportDocument (format "iqtesting-responses").
 * GET  /api/health  — liveness probe.
 *
 * Storage bindings (wrangler.toml):
 *   SESSIONS  — KV namespace; one record per sessionId. A repeat submission
 *               with an existing id is rejected 409 (duplicate protection:
 *               the same administration must never enter the sample twice).
 *   RATE      — KV namespace; per-IP fixed-window counters.
 *
 * The worker stores the payload verbatim after validation (sizes capped by
 * validator.js) — the raw record is the artifact of record. The norming
 * pipeline does NOT re-validate offline (tools/norming.ts only re-runs
 * validity screening), so this validation is the only gate. No CORS
 * wildcard echo: the allowed origin comes from env.ALLOWED_ORIGIN (the
 * GitHub Pages URL), set at deploy time.
 */

import { validateSubmission, checkRate } from "./validator.js";

const RATE_LIMIT = 5;          // submissions per IP per window
const RATE_WINDOW_MS = 60 * 60 * 1000;
// ~13x the largest real export (438 responses + routing logs ≈ 150 KB);
// backstop for junk the field-level caps cannot name.
const MAX_BODY_CHARS = 2 * 1024 * 1024;

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(status, body, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (url.pathname === "/api/health") {
      return json(200, { ok: true }, env);
    }

    if (url.pathname !== "/api/submit" || request.method !== "POST") {
      return json(404, { ok: false, reason: "not found" }, env);
    }

    // Rate limit before touching the body. The DECISION is the same pure
    // checkRate the test suite pins (validator.js); KV only supplies the
    // counter store: read the prior window state once, run it through
    // checkRate, and write the incremented state back BEFORE serving (and
    // even when refusing), with a TTL of one window — so sequential
    // requests always observe each other's increments and blocked attempts
    // still count toward the window.
    //
    // HONEST LIMITATION — Cloudflare KV has no atomic read-modify-write and
    // is eventually consistent (cross-colo propagation can lag ~60s), so
    // concurrent requests can all read the pre-increment state and all be
    // allowed: RATE_LIMIT is best-effort throttling, not a hard cap. An
    // attacker firing concurrent requests — or rotating IPv6 addresses,
    // which changes the per-IP key entirely — can exceed 5/hour. The
    // duplicate-session claim below has the same get-then-put race: a
    // replayed sessionId inside the propagation window is accepted and
    // overwrites the original record. A hard guarantee would require a
    // Durable Object or a Cloudflare rate-limiting rule; KV is kept as the
    // zero-cost throttle for sequential abuse.
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const now = Date.now();
    let rateCount;
    try {
      const rateKey = "rate:" + ip;
      let entry = null;
      try {
        entry = JSON.parse((await env.RATE.get(rateKey)) ?? "null");
      } catch {
        entry = null; // corrupt counter state: reset rather than fail
      }
      const counts = new Map();
      if (entry !== null && Number.isFinite(entry.count) && Number.isFinite(entry.windowStart)) {
        counts.set(ip, entry);
      }
      const verdict = checkRate(counts, ip, now, RATE_LIMIT, RATE_WINDOW_MS);
      await env.RATE.put(rateKey, JSON.stringify(counts.get(ip)), {
        expirationTtl: Math.ceil(RATE_WINDOW_MS / 1000),
      });
      if (!verdict.allowed) {
        return json(429, { ok: false, reason: "rate limited" }, env);
      }
      rateCount = verdict.count;
    } catch {
      // KV unavailable: fail open for collection availability (rate
      // limiting is best-effort — see the limitation note above); the
      // validator still guards content.
      rateCount = -1;
    }

    let body;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY_CHARS) {
        return json(413, { ok: false, reason: "body too large" }, env);
      }
      body = JSON.parse(text);
    } catch {
      return json(400, { ok: false, reason: "body is not JSON" }, env);
    }

    const verdict = validateSubmission(body);
    if (!verdict.ok) {
      return json(422, verdict, env);
    }

    // Duplicate protection: one record per session id.
    const sessionKey = "session:" + body.sessionId;
    try {
      const existing = await env.SESSIONS.get(sessionKey);
      if (existing !== null) {
        return json(409, { ok: false, reason: "duplicate session" }, env);
      }
      await env.SESSIONS.put(sessionKey, JSON.stringify({
        // Stored as the validated document itself (not nested under a
        // payload key), stamped with the worker receipt time. The norming
        // reader (tools/norming.ts loadExports) accepts a JSON record only
        // when format === "iqtesting-responses" and version === 1 sit at
        // the TOP level — validateSubmission guarantees both for body, so
        // the spread carries them and worker-collected sessions load
        // instead of being skipped as "wrong-format". receivedAt comes
        // last so a client-supplied value cannot spoof it; the reader
        // ignores unknown fields.
        ...body,
        receivedAt: now,
      }));
    } catch {
      return json(503, { ok: false, reason: "storage unavailable" }, env);
    }

    return json(200, { ok: true, rateLimitedRemaining: rateCount < 0 ? null : RATE_LIMIT - rateCount }, env);
  },
};
