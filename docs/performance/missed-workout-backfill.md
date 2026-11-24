# Missed-workout backfill performance

## Full-history weekly grouping

- Date: 2026-11-24
- Workload: 5,000 records in one calendar week, grouped seven times with the
  median reported.
- Baseline: 15.32 ms
- Result: 6.88 ms
- Change: append to each newly allocated week bucket instead of copying the
  growing bucket for every record.
- Verdict: kept; median duration decreased by 55% with identical grouped output.

The timing harness was temporary to avoid adding a machine-dependent assertion
to the normal test suite. Existing journal tests guard ordering and grouping
behavior.

## Previous-workout blank search

- Date: 2026-11-24
- Workload: filter and select the first 12 of 100,000 records, repeated seven
  times with the median reported.
- Baseline: 1.42 ms
- Proposed change: bypass filtering when the query is blank.
- Verdict: not attempted; the baseline is already well below an interaction
  frame and real personal histories are much smaller. A special branch would
  add maintenance cost without a meaningful user-facing improvement.

## Release bundle check

- Before simplification: 2,265,488 bytes
- After simplification: 2,266,294 bytes
- Delta: +806 bytes (+0.04%)
- Verdict: acceptable; the structural readability improvement did not
  materially change the Hermes release bundle size.
