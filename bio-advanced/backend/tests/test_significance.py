from __future__ import annotations

import numpy as np
import pytest

from app.domain import chargaff
from app.domain.significance import run_permutation_test


def _seq(text: str) -> np.ndarray:
    return np.frombuffer(text.encode("ascii"), dtype=np.uint8)


def test_permutation_test_returns_valid_pvalue_range():
    rng = np.random.default_rng(7)
    sequence = np.array([ord(b) for b in rng.choice(list("ATGC"), size=500)], dtype=np.uint8)

    result = run_permutation_test(sequence, window_size=50, step_size=50, n_permutations=20)

    assert result.n_permutations == 20
    assert 0.0 <= result.p_value <= 1.0
    assert isinstance(result.permuted_mean, float)
    assert isinstance(result.permuted_std, float)

    direct = chargaff.compute_window_counts(sequence, window_size=50, step_size=50)
    assert result.observed_mean_score == pytest.approx(float(np.mean(direct.score)))


def test_permutation_test_homogeneous_sequence_has_zero_variance_and_neutral_zscore():
    # Every permutation of an all-A sequence is identical, so the null
    # distribution has zero variance and the observed score can't deviate
    # from it — z_score falls back to 0.0 (guards div-by-zero) and every
    # permuted mean equals the observed mean, so p_value is 1.0.
    sequence = _seq("A" * 200)

    result = run_permutation_test(sequence, window_size=50, step_size=50, n_permutations=10)

    assert result.permuted_std == 0.0
    assert result.z_score == 0.0
    assert result.p_value == pytest.approx(1.0)


def test_permutation_test_propagates_invalid_window_size():
    sequence = _seq("ATGC" * 10)
    with pytest.raises(ValueError):
        run_permutation_test(sequence, window_size=0, step_size=0, n_permutations=10)
