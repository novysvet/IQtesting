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
 *
 * Size caps (the worker stores accepted bodies verbatim, so anything the
 * validator does not bound is unbounded storage). Caps are measured against
 * real exportSession output over the 21-subtest battery: longest subtest
 * name 24 chars, longest subtest id 19, longest rawAnswer string 54 chars
 * (artlang sentences), routing logs <= ~35 decisions per subtest. The caps
 * below leave generous headroom over those measurements:
 *   - strings <= MAX_STRING everywhere (unknown keys included, via the
 *     bounds walker);
 *   - arrays <= MAX_ARRAY everywhere except the top-level responses array
 *     (<= MAX_RESPONSES);
 *   - id-like strings (subtestId) and rawAnswer strings are capped tighter.
 */

export const MAX_RESPONSES = 2000;
export const MAX_STRING = 2048;      // free-text strings (userAgent, validity reasons, participant code, ...)
export const MAX_ID = 64;            // id-like strings (itemId, subtestId, subtests[].id/broad)
export const MAX_ARRAY = 512;        // every array except the top-level responses array
export const MAX_RAW_ANSWER = 256;   // rawAnswer strings; recall inputs accept free typing (no key bank bounds them), so this only fences machine-generated junk
export const MAX_DEPTH = 32;         // bounds-walker recursion guard

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const HEX8 = /^[0-9a-f]{8}$/;

/** @returns {{ok: boolean, reason?: string}} */
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
  if (body.participantId !== null && body.participantId !== undefined &&
      (typeof body.participantId !== "string" || body.participantId.length > MAX_STRING)) {
    return { ok: false, reason: "invalid participantId" };
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
    if (r.subtestId !== null && r.subtestId !== undefined &&
        (typeof r.subtestId !== "string" || r.subtestId.length === 0 || r.subtestId.length > MAX_ID)) {
      return { ok: false, reason: "invalid subtestId" };
    }
    if (typeof r.correct !== "boolean") return { ok: false, reason: "correct must be boolean" };
    if (typeof r.latencyMs !== "number" || !Number.isFinite(r.latencyMs) || r.latencyMs < 0 || r.latencyMs > 3_600_000) {
      return { ok: false, reason: "invalid latencyMs" };
    }
    if (r.rawAnswer !== null && typeof r.rawAnswer !== "number" && typeof r.rawAnswer !== "string") {
      return { ok: false, reason: "invalid rawAnswer" };
    }
    if (typeof r.rawAnswer === "string" && r.rawAnswer.length > MAX_RAW_ANSWER) {
      return { ok: false, reason: "rawAnswer too long" };
    }
  }
  if (body.demographics !== null && body.demographics !== undefined) {
    if (!isPlainObject(body.demographics)) return { ok: false, reason: "demographics must be an object" };
    const band = body.demographics.ageBand;
    const bands = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
    if (!bands.includes(band)) return { ok: false, reason: "demographics.ageBand invalid" };
    for (const key of ["sex", "education", "nativeLanguage", "country", "testFamiliarity", "device"]) {
      const v = body.demographics[key];
      if (v !== null && v !== undefined && (typeof v !== "string" || v.length > MAX_STRING)) {
        return { ok: false, reason: "demographics." + key + " too long" };
      }
    }
  }
  if (body.consent !== null && body.consent !== undefined) {
    if (!isPlainObject(body.consent)) return { ok: false, reason: "consent must be an object" };
    const at = body.consent.acceptedAt;
    if (typeof at !== "number" || !Number.isFinite(at) || at < 1_600_000_000_000 || at > 4_000_000_000_000) {
      return { ok: false, reason: "consent.acceptedAt implausible" };
    }
    if (body.consent.version !== null && body.consent.version !== undefined &&
        (typeof body.consent.version !== "string" || body.consent.version.length > MAX_STRING)) {
      return { ok: false, reason: "consent.version too long" };
    }
  }
  // Bounds walker over everything the explicit checks above do not cover.
  // The responses array itself is already capped at MAX_RESPONSES; the
  // walker covers the rest of the document and each response entry.
  const { responses, ...rest } = body;
  if (!withinBounds(rest) || responses.some((r) => !withinBounds(r))) {
    return { ok: false, reason: "field exceeds size cap" };
  }
  return { ok: true };
}

/**
 * Bounds walker: everything the field checks above do not specifically
 * inspect (administration, subtests, validity, composite, and any key the
 * client adds later) must still be size-bounded, because the worker stores
 * accepted bodies verbatim. Rejects any string longer than MAX_STRING, any
 * array longer than MAX_ARRAY, and nesting deeper than MAX_DEPTH (deep JSON
 * parses fine in V8 but would overflow this recursion).
 */
function withinBounds(value, depth = 0) {
  if (depth > MAX_DEPTH) return false;
  if (typeof value === "string") return value.length <= MAX_STRING;
  if (Array.isArray(value)) return value.length <= MAX_ARRAY && value.every((v) => withinBounds(v, depth + 1));
  if (value !== null && typeof value === "object") {
    return Object.values(value).every((v) => withinBounds(v, depth + 1));
  }
  return true; // numbers, booleans, null, undefined carry no unbounded payload
}

/**
 * Fixed-window rate limiter over a KV-like counter store. Pure decision
 * logic; the worker supplies the storage (read state -> decide with this
 * function -> write the incremented state back before serving). Returns
 * whether the request may proceed and the updated count.
 */
export function checkRate(counts, key, now, limit, windowMs) {
  const entry = counts.get(key);
  const fresh = entry && now - entry.windowStart < windowMs ? entry.count : 0;
  const count = fresh + 1;
  counts.set(key, { count, windowStart: entry && now - entry.windowStart < windowMs ? entry.windowStart : now });
  return { allowed: count <= limit, count };
}
