export declare const MAX_RESPONSES: number;

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateSubmission(body: unknown): ValidationResult;

export function checkRate(
  counts: Map<string, { count: number; windowStart: number }>,
  key: string,
  now: number,
  limit: number,
  windowMs: number,
): { allowed: boolean; count: number };
