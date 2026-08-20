import { useEffect, useRef, useState } from "react";
import type { Subtest } from "../core/types.ts";

/**
 * Whole-page matching subtest (1926-SAT definitions format): every
 * definition is presented at once; the examinee types a definition number
 * next to each bank word. Submitting (or the section clock hitting zero)
 * records all items at once via session.answerMatching.
 */
export function MatchingScreen({
  subtest,
  remainingMs,
  onAnswer,
}: {
  subtest: Subtest;
  remainingMs: number;
  onAnswer: (assignments: number[], timedOut: boolean) => void;
}) {
  const bank = subtest.matching?.bank ?? [];
  const [raw, setRaw] = useState<string[]>(() => bank.map(() => ""));
  const submittedRef = useRef(false);
  const rawRef = useRef(raw);
  rawRef.current = raw;

  const parse = (): number[] => rawRef.current.map((v) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? 0 : n;
  });

  // The page owns its expiry so typed work is submitted, not discarded.
  // Child effects run before the parent's expiry effect in the same commit.
  useEffect(() => {
    if (remainingMs > 0 || submittedRef.current) return;
    submittedRef.current = true;
    onAnswer(parse(), true);
  }, [remainingMs, onAnswer]);

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onAnswer(parse(), false);
  };

  const assigned = new Set(parse().filter((n) => n >= 1 && n <= subtest.items.length));

  return <section className="match-page">
    <div className="item-meta"><span className="label">{subtest.name}</span>
      <span className="num">{subtest.items.length} definitions · {bank.length} words</span></div>
    <div className="match-work">
      <div className="match-defs" aria-label="definitions">
        {subtest.items.map((item, i) => (
          <p key={item.id} className={"match-def " + (assigned.has(i + 1) ? "dfn-done" : "")}>
            {item.prompt}
          </p>
        ))}
      </div>
      <div className="match-bank" aria-label="answer bank">
        {bank.map((word, i) => (
          <label key={word} className="word-item">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={raw[i]}
              autoComplete="off"
              aria-label={"definition number for " + word}
              onChange={(e) => {
                // Free 2-digit entry; out-of-range numbers simply match no
                // definition, so no clamping while typing.
                const clean = e.target.value.replace(/\D/g, "").slice(0, 2).replace(/^0+(?=\d)/, "");
                setRaw((prev) => {
                  const next = [...prev];
                  next[i] = clean;
                  return next;
                });
              }}
            />
            <span>{word}</span>
          </label>
        ))}
      </div>
    </div>
    <div className="item-actions">
      <span>A number may only be used once. Unmatched definitions are scored incorrect.</span>
      <button className="primary" onClick={submit}>Record answers <span aria-hidden="true">→</span></button>
    </div>
  </section>;
}
