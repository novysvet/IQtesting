"""Measure wordfreq Zipf values for Precision Lexicon candidates.

Zipf = log10(occurrences per billion words), wordfreq 'en' (rspeer/wordfreq).
Difficulty mapping used by the bank: bIQ = 160 - 15*zipf  =>  b_theta = 4 - zipf.

Usage: python lexicon_zipf.py lexicon_candidates.csv
"""
import csv
import sys

from wordfreq import zipf_frequency

BANDS = [  # (name, lo, hi) in zipf units; answer word must fall inside
    ("B1", 5.40, 7.00),
    ("B2", 4.65, 5.40),
    ("B3", 3.95, 4.65),
    ("B4", 3.25, 3.95),
    ("B5", 0.00, 3.25),
]


def band_of(z: float) -> str:
    for name, lo, hi in BANDS:
        if lo <= z < hi:
            return name
    return "?"


def main(path: str) -> None:
    rows = list(csv.reader(open(path, encoding="utf-8")))[1:]
    print(f"{'answer':<14}{'z':>6}  {'b':>6}  band  neighbors (zipf)")
    for answer, *others in rows:
        words = [answer] + others
        zs = {w: zipf_frequency(w, "en") for w in words}
        az = zs[answer]
        other_z = [zs[w] for w in others]
        width = max(zs.values()) - min(zs.values())
        mean_others = sum(other_z) / len(other_z)
        drift = az - mean_others
        flags = []
        if az == 0:
            flags.append("UNATTESTED-ANSWER")
        if any(z == 0 for z in other_z):
            flags.append("unattested-neighbor")
        if width > 1.8:
            flags.append(f"WIDE {width:.2f}")
        if drift < -1.25 or drift > 1.0:
            flags.append(f"DRIFT {drift:+.2f}")
        nb = " ".join(f"{w}:{zs[w]:.2f}" for w in others)
        print(f"{answer:<14}{az:6.2f}  {4 - az:6.2f}  {band_of(az)}    {nb}  {' '.join(flags)}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "tools/lexicon_candidates.csv")
