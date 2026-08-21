export declare const MAX_RESPONSES: number;
export declare const MAX_STRING: number;
export declare const MAX_ID: number;
export declare const MAX_ARRAY: number;
export declare const MAX_RAW_ANSWER: number;
export declare const MAX_DEPTH: number;

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
