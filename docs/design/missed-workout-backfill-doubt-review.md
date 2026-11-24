# Doubt Review: Missed Workout Backfill

## Cycle 1

Cross-model review was offered and declined. Two isolated reviewers challenged
the data/interface contract and UI contract. Their findings were reconciled as
follows before implementation.

### Valid and actionable

- Make Save asynchronous and serialize it with existing AsyncStorage writes;
  do not dismiss the draft or announce success before persistence succeeds.
- Salvage a record with malformed optional v15 metadata by dropping only that
  metadata; never replace otherwise valid history with defaults for this case.
- Introduce a validated backfill-record type at the insertion boundary.
- Make all comparison, analytics, grouping, and PR functions independent of
  input array order and aware of date-only records.
- Preserve skipped sets when cloning history; pre-complete only planned sets.
- Define deterministic placement for invalid legacy dates.
- Reuse the existing numeric validation and stored/display unit conversions.
- Namespace backfill identifiers and define normalized equality for retries.
- Define final record field mapping and expose narrow editor callbacks instead
  of arbitrary whole-draft replacement.
- Guard dirty drafts from Change Source and root-tab navigation.
- Require both source paths to meet the one-minute target.
- Add search for deep previous history and show the year on every backfill date.
- Replace inaccessible/non-scrollable picker reuse with direct exact numeric
  inputs and a single validated date field plus quick shortcuts.
- Block the flow until app state is loaded, expose persistence health, define
  active temporary-plan eligibility, and represent async saving truthfully.
- Add/remove sets for an existing exercise so remembered set counts can be
  represented.
- Add explicit scroll/focus callbacks and live-workout navigation behavior.

### Contract misreads corrected

- Creating a new exercise during backfill remains explicitly outside the
  confirmed MVP. The flow can accurately reconstruct all sets for exercises in
  the selected source; a different exercise requires choosing a closer source
  or remains a later feature.
- Lossless migration applies to the new v14-to-v15 step. Older supported
  versions retain their existing migration semantics; this feature does not
  retroactively redesign historical migrations.

### Accepted trade-offs

- A planned source starts with all valid prescribed sets completed because the
  feature optimizes for confirming a performed plan. The final set count and
  deliberate Save action make this visible; the user can uncheck or remove
  deviations.
- The flow remains inside the existing root `ScrollView` and uses bounded
  source results rather than introducing navigation or list dependencies.

### Behavioral doubt gate

The corrected claims are proved through RED/GREEN tests for migration salvage,
chronology, idempotent insertion, source completion semantics, validation,
unit-safe record construction, and current-load immutability. These failing
tests serve as the next doubt cycle for behavioral claims before UI exposure.
