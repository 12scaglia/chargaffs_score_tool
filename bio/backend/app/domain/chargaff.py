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


@dataclass(frozen=True, slots=True)
class GlobalStatistics:
    mean: float
    median: float
    min: float
    max: float
    std_dev: float
    total_windows: int


def compute_window_counts(sequence: np.ndarray, window_size: int) -> WindowCounts:
    """Split `sequence` (uint8 ASCII codes, already cleaned to A/T/G/C only)
    into sequential, non-overlapping windows of `window_size` bp and compute,
    for each window, the base counts and the Chargaff Parity Score:

        Score = 1 - (|A - T| + |G - C|) / N

    The last window may be shorter than `window_size` if it does not evenly
    divide the sequence length. Fully vectorized with NumPy (no per-window
    Python loop) so it stays fast for millions of windows.
    """
    if window_size <= 0:
        raise ValueError("window_size must be a positive integer")

    total_length = sequence.shape[0]
    if total_length == 0:
        empty_i = np.array([], dtype=np.int64)
        return WindowCounts(empty_i, empty_i, empty_i, empty_i, empty_i, empty_i, np.array([], dtype=np.float64))

    num_windows = -(-total_length // window_size)  # ceil division
    padded_length = num_windows * window_size
    pad_width = padded_length - total_length

    if pad_width:
        padded = np.zeros(padded_length, dtype=sequence.dtype)
        padded[:total_length] = sequence
    else:
        padded = sequence

    reshaped = padded.reshape(num_windows, window_size)

    counts = {base: (reshaped == code).sum(axis=1, dtype=np.int64) for base, code in BASE_CODES.items()}

    start = np.arange(num_windows, dtype=np.int64) * window_size + 1
    end = np.minimum(start + window_size - 1, total_length)

    a, t, g, c = counts["A"], counts["T"], counts["G"], counts["C"]
    n = a + t + g + c
    n_safe = np.where(n > 0, n, 1)
    score = 1.0 - (np.abs(a - t) + np.abs(g - c)) / n_safe
    score = np.where(n > 0, score, 0.0)

    return WindowCounts(start=start, end=end, a=a, t=t, g=g, c=c, score=score)


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
