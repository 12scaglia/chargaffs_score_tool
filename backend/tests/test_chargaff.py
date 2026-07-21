from __future__ import annotations

import numpy as np
import pytest

from app.domain import chargaff


def _seq(text: str) -> np.ndarray:
    return np.frombuffer(text.encode("ascii"), dtype=np.uint8)


def test_step_size_defaults_to_window_size_matches_non_overlapping_layout():
    sequence = _seq("AATTGGCCAATTGGCCAATT")  # 20 bp
    windows = chargaff.compute_window_counts(sequence, window_size=5)

    assert windows.start.tolist() == [1, 6, 11, 16]
    assert windows.end.tolist() == [5, 10, 15, 20]
    # Each 5bp window is "AATTG"/"GCCAA"/"TTGGC"/"CAATT" style repeats — just
    # check counts sum to window length and no window is dropped/duplicated.
    n = windows.a + windows.t + windows.g + windows.c
    assert n.tolist() == [5, 5, 5, 5]


def test_step_size_none_reproduces_legacy_reshape_behavior():
    rng = np.random.default_rng(42)
    sequence = np.array([ord(b) for b in rng.choice(list("ATGC"), size=997)], dtype=np.uint8)

    via_default = chargaff.compute_window_counts(sequence, window_size=64)
    via_explicit_step = chargaff.compute_window_counts(sequence, window_size=64, step_size=64)

    assert via_default.start.tolist() == via_explicit_step.start.tolist()
    assert via_default.end.tolist() == via_explicit_step.end.tolist()
    assert via_default.a.tolist() == via_explicit_step.a.tolist()
    assert via_default.score.tolist() == via_explicit_step.score.tolist()
    # Last window is the short remainder (997 % 64 == 37).
    assert via_default.end.tolist()[-1] == 997
    assert (via_default.end - via_default.start + 1).tolist()[-1] == 997 - 15 * 64


def test_sliding_window_overlap_counts():
    sequence = _seq("AAAAAGGGGGCCCCCTTTTT")  # 20 bp, 5 of each base in blocks
    windows = chargaff.compute_window_counts(sequence, window_size=10, step_size=5)

    # windows: [1,10], [6,15], [11,20], [16,20] (last one clamped/short)
    assert windows.start.tolist() == [1, 6, 11, 16]
    assert windows.end.tolist() == [10, 15, 20, 20]
    # First window [1,10] = 5 A's + 5 G's
    assert (windows.a[0], windows.g[0], windows.c[0], windows.t[0]) == (5, 5, 0, 0)
    # Second window [6,15] overlaps: 5 G's + 5 C's
    assert (windows.a[1], windows.g[1], windows.c[1], windows.t[1]) == (0, 5, 5, 0)
    # Third window [11,20] = 5 C's + 5 T's
    assert (windows.a[2], windows.g[2], windows.c[2], windows.t[2]) == (0, 0, 5, 5)
    # Fourth window [16,20] clamped to remaining 5 bp = 5 T's
    assert (windows.a[3], windows.g[3], windows.c[3], windows.t[3]) == (0, 0, 0, 5)


def test_gc_skew_and_at_skew_known_composition():
    # 6 G, 2 C, 3 A, 1 T -> gc_skew=(6-2)/8=0.5, at_skew=(3-1)/4=0.5
    sequence = _seq("GGGGGGCCAAAT")
    windows = chargaff.compute_window_counts(sequence, window_size=len(sequence))

    assert windows.gc_skew.tolist() == pytest.approx([0.5])
    assert windows.at_skew.tolist() == pytest.approx([0.5])


def test_zero_denominator_skew_is_zero_not_nan():
    sequence = _seq("AAAATTTT")  # no G/C at all
    windows = chargaff.compute_window_counts(sequence, window_size=len(sequence))

    assert windows.gc_skew.tolist() == [0.0]
    assert windows.at_skew.tolist() == pytest.approx([0.0])


def test_empty_sequence_returns_empty_arrays_including_skew():
    windows = chargaff.compute_window_counts(np.array([], dtype=np.uint8), window_size=10)

    assert windows.start.size == 0
    assert windows.gc_skew.size == 0
    assert windows.at_skew.size == 0


def test_invalid_window_and_step_size_raise():
    sequence = _seq("ATGC")
    with pytest.raises(ValueError):
        chargaff.compute_window_counts(sequence, window_size=0)
    with pytest.raises(ValueError):
        chargaff.compute_window_counts(sequence, window_size=4, step_size=-1)
