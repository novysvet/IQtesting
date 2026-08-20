import type { SessionState } from "./session.ts";

/**
 * Session autosave. A real administration is 60-180 minutes of irreplaceable
 * response data; a closed tab must not destroy it. The serialized session is
 * plain JSON (phases, routing states, responses); on restore the bankVersion
 * is checked against the current bank so a stale save never mixes with
 * edited item parameters.
 */

export const STORAGE_KEY = "iqtesting.session.v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** localStorage when available (browser), else null (SSR/tests inject their own). */
export function defaultStorage(): StorageLike | null {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls) return null;
    ls.getItem(STORAGE_KEY);
    return ls as StorageLike;
  } catch {
    return null;
  }
}

/** A Map-backed shim for tests and non-browser environments. */
export function memoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
}

export interface SavedSession {
  state: SessionState;
  savedAt: number;
}

export function saveSession(state: SessionState, storage: StorageLike, savedAt = Date.now()): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ state, savedAt } satisfies SavedSession));
  } catch {
    // Quota or serialization failure must never break an administration.
  }
}

/**
 * Restore a saved session. Returns null when nothing is stored, the payload
 * is malformed, or the saved bank no longer matches the running bank. A
 * finished session is still returned (its responses are exportable); expiry
 * of an in-progress session is the caller's decision via budgetMs.
 */
export function loadSession(
  storage: StorageLike,
  currentBankVersion: string,
): SavedSession | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedSession;
    if (!parsed || typeof parsed !== "object" || !parsed.state) return null;
    const state = parsed.state;
    if (typeof state.sessionId !== "string" || state.sessionId.length === 0) return null;
    if (state.bankVersion !== currentBankVersion) return null;
    if (!Array.isArray(state.responses) || !Array.isArray(state.routing)) return null;
    if (!state.phase || typeof state.phase.kind !== "string") return null;
    if (typeof parsed.savedAt !== "number") return null;
    return { state, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function clearSession(storage: StorageLike): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
