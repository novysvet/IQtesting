/**
 * Submission validator for the IQtesting collection endpoint.
 *
 * Pure and dependency-free so it can run identically in the Cloudflare
 * Worker and in the node test suite. The client's exportSession is trusted
 * for NOTHING here: every field is re-checked, sizes are capped, and
 * anything malformed is rejected with a machine-readable reason.
 *
 * Validation contract (format "iqtesting-responses", version 1):
 *   - sessionId: string, 8..64 chars;
 *   - bankVersion: 8-hex content hash;
 *   - form: "adaptive" | "calibration";
 *   - responses: 1..2000 entries, each with itemId, boolean correct,
 *     numeric latencyMs (0..3_600_000), and no NaN/prototype pollution;
 *   - demographics.ageBand present when demographics is present;
 *   - consent acceptedAt must be a plausible epoch ms when present.
 */

export const MAX_RESPONSES = 2000;

/** @returns {{ok: boolean, reason?: string}} */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const HEX8 = /^[0-9a-f]{8}$/;

export function validateSubmission(body) {
  if (!isPlainObject(body)) return { ok: false, reason: "body must be an object" };
  if (body.format !== "iqtesting-responses") return { ok: false, reason: "unknown format" };
  if (body.version !== 1) return { ok: false, reason: "unsupported version" };
  if (typeof body.sessionId !== "string" || body.sessionId.length < 8 || body.sessionId.length > 64) {
    return { ok: false, reason: "invalid sessionId" };
  }
  if (typeof body.bankVersion !== "string" || !HEX8.test(body.bankVersion)) {
    return { ok: false, reason: "invalid bankVersion" };
  }
  if (body.form !== undefined && body.form !== "adaptive" && body.form !== "calibration") {
    return { ok: false, reason: "invalid form" };
  }
  if (!Array.isArray(body.responses) || body.responses.length === 0) {
    return { ok: false, reason: "responses missing or empty" };
  }
  if (body.responses.length > MAX_RESPONSES) {
    return { ok: false, reason: "too many responses" };
  }
  for (const r of body.responses) {
    if (!isPlainObject(r)) return { ok: false, reason: "response must be an object" };
    if (typeof r.itemId !== "string" || r.itemId.length === 0 || r.itemId.length > 64) {
      return { ok: false, reason: "invalid itemId" };
    }
    if (typeof r.correct !== "boolean") return { ok: false, reason: "correct must be boolean" };
    if (typeof r.latencyMs !== "number" || !Number.isFinite(r.latencyMs) || r.latencyMs < 0 || r.latencyMs > 3_600_000) {
      return { ok: false, reason: "invalid latencyMs" };
    }
    if (r.rawAnswer !== null && typeof r.rawAnswer !== "number" && typeof r.rawAnswer !== "string") {
      return { ok: false, reason: "invalid rawAnswer" };
    }
  }
  if (body.demographics !== null && body.demographics !== undefined) {
    if (!isPlainObject(body.demographics)) return { ok: false, reason: "demographics must be an object" };
    const band = body.demographics.ageBand;
    const bands = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
    if (!bands.includes(band)) return { ok: false, reason: "demographics.ageBand invalid" };
  }
  if (body.consent !== null && body.consent !== undefined) {
    if (!isPlainObject(body.consent)) return { ok: false, reason: "consent must be an object" };
    const at = body.consent.acceptedAt;
    if (typeof at !== "number" || !Number.isFinite(at) || at < 1_600_000_000_000 || at > 4_000_000_000_000) {
      return { ok: false, reason: "consent.acceptedAt implausible" };
    }
  }
  return { ok: true };
}

/**
 * Fixed-window rate limiter over a KV-like counter store. Pure decision
 * logic; the worker supplies the storage. Returns whether the request may
 * proceed and the updated count.
 */
export function checkRate(counts, key, now, limit, windowMs) {
  const entry = counts.get(key);
  const fresh = entry && now - entry.windowStart < windowMs ? entry.count : 0;
  const count = fresh + 1;
  counts.set(key, { count, windowStart: entry && now - entry.windowStart < windowMs ? entry.windowStart : now });
  return { allowed: count <= limit, count };
}
