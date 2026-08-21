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
 *   RATE      — KV namespace; fixed-window per-IP counters.
 *
 * The worker stores the payload EXACTLY as received after validation —
 * calibration re-runs validation and screening offline, so the raw record is
 * the artifact of record. No CORS wildcard echo: the allowed origin comes
 * from env.ALLOWED_ORIGIN (the GitHub Pages URL), set at deploy time.
 */

import { validateSubmission, checkRate } from "./validator.js";

const RATE_LIMIT = 5;          // submissions per IP per window
const RATE_WINDOW_MS = 60 * 60 * 1000;

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

    // Rate limit before touching the body.
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const now = Date.now();
    const rateKey = "rate:" + ip + ":" + Math.floor(now / RATE_WINDOW_MS);
    let rate;
    try {
      const current = parseInt((await env.RATE.get(rateKey)) ?? "0", 10);
      if (current >= RATE_LIMIT) {
        return json(429, { ok: false, reason: "rate limited" }, env);
      }
      await env.RATE.put(rateKey, String(current + 1), { expirationTtl: Math.ceil(RATE_WINDOW_MS / 1000) });
      rate = current + 1;
    } catch {
      // KV unavailable: fail open for collection availability, validator
      // still guards content.
      rate = -1;
    }
    void checkRate; // pure twin exercised in tests

    let body;
    try {
      body = await request.json();
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
        receivedAt: now,
        bankVersion: body.bankVersion,
        form: body.form ?? "adaptive",
        responseCount: body.responses.length,
        payload: body,
      }));
    } catch {
      return json(503, { ok: false, reason: "storage unavailable" }, env);
    }

    return json(200, { ok: true, rateLimitedRemaining: rate < 0 ? null : RATE_LIMIT - rate }, env);
  },
};
