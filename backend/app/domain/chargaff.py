"""Core domain logic for the Second Chargaff Parity Rule (PR2).

Isolated from FastAPI / IO concerns: pure NumPy computation over an
already-cleaned sequence of ASCII base codes.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

BASES = ("A", "T", "G", "C")
BASE_CODES = {base: ord(base) for base in BASES}


@dataclass(frozen=True, slots=True)
class WindowCounts:
    start: np.ndarray
    end: np.ndarray
    a: np.ndarray
    t: np.ndarray
    g: np.ndarray
    c: np.ndarray
    score: np.ndarray
    gc_skew: np.ndarray
    at_skew: np.ndarray


@dataclass(frozen=True, slots=True)
class GlobalStatistics:
    mean: float
    median: float
    min: float
    max: float
    std_dev: float
    total_windows: int


def compute_window_counts(sequence: np.ndarray, window_size: int, step_size: int | None = None) -> WindowCounts:
    """Split `sequence` (uint8 ASCII codes, already cleaned to A/T/G/C only)
    into windows of `window_size` bp, advancing by `step_size` bp between
    window starts (defaults to `window_size`, i.e. today's sequential,
    non-overlapping behavior). `step_size < window_size` produces sliding,
    overlapping windows (needed for smooth GC/AT-skew curves); `step_size >
    window_size` produces sparse, gapped sampling.

    For each window, computes base counts, the Chargaff Parity Score:

        Score = 1 - (|A - T| + |G - C|) / N

    and GC-skew / AT-skew:

        GC-skew = (G - C) / (G + C)
        AT-skew = (A - T) / (A + T)

    The last window may be shorter than `window_size` if it does not evenly
    divide the sequence length.

    Implementation note: window counts are derived from per-base prefix sums
    (`np.cumsum` on a boolean mask, one base at a time so only one O(N)
    cumulative array is live at once) rather than the reshape+sum trick used
    when windows were guaranteed non-overlapping. This generalizes to
    arbitrary (possibly overlapping) window boundaries at the cost of a
    transient O(N) int64 array per base. That's a fine tradeoff at the
    bacterial/viral/fungal genome scale this tool targets; a chunked/
    streaming prefix sum would be needed to keep peak memory bounded for
    multi-gigabase inputs, which is out of scope here.
    """
    if window_size <= 0:
        raise ValueError("window_size must be a positive integer")
    step = step_size if step_size else window_size
    if step <= 0:
        raise ValueError("step_size must be a positive integer")

    total_length = sequence.shape[0]
    if total_length == 0:
        empty_i = np.array([], dtype=np.int64)
        empty_f = np.array([], dtype=np.float64)
        return WindowCounts(
            start=empty_i, end=empty_i, a=empty_i, t=empty_i, g=empty_i, c=empty_i,
            score=empty_f, gc_skew=empty_f, at_skew=empty_f,
        )

    num_windows = -(-total_length // step)  # ceil division
    starts0 = np.arange(num_windows, dtype=np.int64) * step
    ends0 = np.minimum(starts0 + window_size, total_length)

    counts: dict[str, np.ndarray] = {}
    for base, code in BASE_CODES.items():
        mask = sequence == code
        cum = np.concatenate(([0], np.cumsum(mask, dtype=np.int64)))
        counts[base] = cum[ends0] - cum[starts0]
        del mask, cum

    start = starts0 + 1  # convert to 1-based inclusive
    end = ends0

    a, t, g, c = counts["A"], counts["T"], counts["G"], counts["C"]
    n = a + t + g + c
    n_safe = np.where(n > 0, n, 1)
    score = 1.0 - (np.abs(a - t) + np.abs(g - c)) / n_safe
    score = np.where(n > 0, score, 0.0)

    gc_sum = g + c
    gc_sum_safe = np.where(gc_sum > 0, gc_sum, 1)
    gc_skew = np.where(gc_sum > 0, (g - c) / gc_sum_safe, 0.0)

    at_sum = a + t
    at_sum_safe = np.where(at_sum > 0, at_sum, 1)
    at_skew = np.where(at_sum > 0, (a - t) / at_sum_safe, 0.0)

    return WindowCounts(start=start, end=end, a=a, t=t, g=g, c=c, score=score, gc_skew=gc_skew, at_skew=at_skew)


def compute_statistics(scores: np.ndarray) -> GlobalStatistics:
    """Aggregate global statistics across all window scores."""
    if scores.size == 0:
        return GlobalStatistics(mean=0.0, median=0.0, min=0.0, max=0.0, std_dev=0.0, total_windows=0)
    return GlobalStatistics(
        mean=float(np.mean(scores)),
        median=float(np.median(scores)),
        min=float(np.min(scores)),
        max=float(np.max(scores)),
        std_dev=float(np.std(scores)),
        total_windows=int(scores.size),
    )
