"""Permutation test for the Chargaff/PR2 score: is the observed mean score
different from what you'd expect from a randomly shuffled version of the
same sequence (same base composition, no positional structure)?

Isolated from FastAPI/IO concerns, like chargaff.py — reuses
compute_window_counts rather than duplicating the score formula.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.domain.chargaff import compute_window_counts


@dataclass(frozen=True, slots=True)
class SignificanceResult:
    observed_mean_score: float
    permuted_mean: float
    permuted_std: float
    z_score: float
    p_value: float
    n_permutations: int


def _mean_score(sequence: np.ndarray, window_size: int, step_size: int) -> float:
    windows = compute_window_counts(sequence, window_size, step_size)
    return float(np.mean(windows.score)) if windows.score.size else 0.0


def run_permutation_test(
    sequence: np.ndarray, window_size: int, step_size: int, n_permutations: int
) -> SignificanceResult:
    """Shuffles `sequence` (in-place on a private copy) `n_permutations`
    times, recomputing the mean PR2 score each time to build a null
    distribution, then compares the observed mean score against it.

    Two-sided empirical p-value: the fraction of permuted means at least as
    far from the permuted mean as the observed mean is. Doesn't assume a
    direction of skew a priori.
    """
    observed_mean = _mean_score(sequence, window_size, step_size)

    rng = np.random.default_rng()
    seq = sequence.copy()
    permuted_means = np.empty(n_permutations, dtype=np.float64)
    for i in range(n_permutations):
        rng.shuffle(seq)
        permuted_means[i] = _mean_score(seq, window_size, step_size)

    perm_mean = float(np.mean(permuted_means))
    perm_std = float(np.std(permuted_means))
    z_score = (observed_mean - perm_mean) / perm_std if perm_std > 0 else 0.0
    p_value = float(np.mean(np.abs(permuted_means - perm_mean) >= np.abs(observed_mean - perm_mean)))

    return SignificanceResult(
        observed_mean_score=observed_mean,
        permuted_mean=perm_mean,
        permuted_std=perm_std,
        z_score=z_score,
        p_value=p_value,
        n_permutations=n_permutations,
    )
