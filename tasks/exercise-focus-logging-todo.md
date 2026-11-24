# Task List: Exercise Focus Logging

Plan: [`tasks/exercise-focus-logging-plan.md`](./exercise-focus-logging-plan.md)
Idea brief: [`docs/ideas/exercise-focus-logging.md`](../docs/ideas/exercise-focus-logging.md)

## Task 1: Define the nullable-rep contract and compatibility helper

**Description:** Keep `Exercise.sets` as the only performed-data source, allow
reps to be explicitly untracked with `null`, and add a format-aware helper that
interprets legacy rows or consistent exercise-summary rows without inventing
volume.

**Acceptance criteria:**

- [x] Valid summaries require finite non-negative weight, at least one completed
  row, optional positive integer reps, and internally consistent rows.
- [x] Legacy exercises produce exactly their current set, weight, rep, and
  volume results through compatibility helpers.
- [x] Untracked summary reps produce unavailable volume rather
  than zero, defaults, or copied prescription values.

**Verification:**

- [x] Focused domain tests cover legacy, rep-untracked summary, bodyweight, and
  inconsistent summary rows.
- [x] `npm test` passes.
- [x] `npx tsc --noEmit` passes.
- [x] Signed iOS build, install-over-existing, and launch succeed on the connected iPhone.

**Dependencies:** None

**Files likely touched:**

- `src/domain/training.ts`
- `src/domain/training.test.ts`

**Estimated scope:** Small — 2 files

## Task 2: Expand persistence to schema v16 — Complete

**Description:** Add explicit exercise log-format metadata and validation for
nullable reps. Upgrade v15 state as legacy format, preserve workouts, records,
and active sessions, and round-trip new summary state without a second
performed-data representation.

**Acceptance criteria:**

- [x] Valid v15 state migrates to v16 without changing legacy workout or
  history values; valid summary active sessions and records round-trip.
- [x] Malformed summaries are rejected or safely normalized without discarding
  otherwise valid historical records.
- [x] Legacy templates never accept nullable reps, while explicitly formatted
  summary sessions and records do.

**Verification:**

- [x] Migration tests cover v15 upgrade, v16 reload, active-session recovery,
  malformed input, and preservation of legacy history.
- [x] `npm test` passes.
- [x] `npx tsc --noEmit` passes.
- [x] Signed iOS build, install-over-existing, and launch succeed with the same application data container.

**Dependencies:** Task 1

**Files likely touched:**

- `src/storage/migrations.ts`
- `src/storage/migrations.test.ts`
- `src/storage/appStorage.ts`

**Estimated scope:** Medium — 3 files

## Checkpoint: Data safety

- [ ] Legacy and new state round-trip without data loss.
- [ ] All tests and TypeScript checks pass.
- [ ] Signed application installs and launches with the existing app data intact.
- [ ] Review summary-log and migration contracts before enabling new writes.

## Task 3: Implement the history-seeded summary session flow — Complete

**Description:** Start new active workouts in summary format with one row per completed working set,
seeded from the newest valid non-deload performance. Add immutable operations
to adjust weight, set count, and optional reps; complete or reopen once; and
finish a workout into a summary-aware `SessionRecord` without duplicate writes.

**Acceptance criteria:**

- [ ] Weight and set count come from the latest valid normal performance, with
  safe prescription fallbacks; reps always begin untracked.
- [ ] Complete and reopen operations are idempotent, preserve entered values,
  and never mark prescription sets as performed.
- [ ] Finishing creates one record, updates future defaults safely, and marks
  volume unavailable whenever any completed exercise lacks reps.

**Verification:**

- [ ] Domain tests cover legacy/summary seeding, deload exclusion, bodyweight,
  repeated completion, reopening, partial workouts, and duplicate finish attempts.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Signed iOS build, install-over-existing, and launch succeed on the connected iPhone.

**Dependencies:** Tasks 1 and 2

**Files likely touched:**

- `src/domain/training.ts`
- `src/domain/training.test.ts`
- `App.tsx`

**Estimated scope:** Medium — 3 files

## Task 4: Deliver Flexible Focus Mode — Implemented; hands-on accessibility QA pending

**Description:** Replace the active per-set table with one focused exercise
card and a compact selectable queue. Provide large weight and set controls,
an optional representative-reps control, a deliberate summary-labelled
completion button, automatic advancement, and safe reopening.

**Acceptance criteria:**

- [ ] The focused card shows current defaults and a button such as
  `Complete · 3 sets at 80 kg`; reps appear only when explicitly enabled.
- [ ] Completing advances to the next unfinished exercise, while any pending
  or completed exercise can be selected or reopened without losing values.
- [ ] Bodyweight, invalid input, completed/current/pending state, 44-point
  targets, VoiceOver labels, and Dynamic Type are understandable without color alone.

**Verification:**

- [ ] Pure presentation-state tests cover action labels, next-exercise choice,
  invalid values, bodyweight copy, and reopening behavior.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Signed iOS build installs and launches; one-handed device testing confirms each exercise can normally be logged in a few seconds.

**Dependencies:** Task 3

**Files likely touched:**

- `src/components/ExerciseFocusCard.tsx`
- `src/components/ExerciseCard.tsx`
- `src/screens/WorkoutScreen.tsx`
- `App.tsx`

**Estimated scope:** Medium — 4 files

## Checkpoint: Core experience

- [ ] A full active workout can be logged without opening a per-set table.
- [ ] Defaults, out-of-order selection, completion, reopening, and finish work end to end.
- [ ] Tests, type checking, signed build, install, launch, and data-preservation checks pass.
- [ ] Review the physical-device interaction before adapting secondary screens.

## Task 5: Render honest history and comparisons — Complete

**Description:** Teach workout history and session comparison logic to display
summary set count and working weight directly. Show representative reps only
when tracked, and suppress rep/volume deltas when either side lacks measured reps.

**Acceptance criteria:**

- [ ] New history reads `3 sets · 80 kg` and clearly labels reps as untracked
  when absent; legacy per-set history remains unchanged.
- [ ] Weight comparisons remain available for compatible records, while rep
  and volume comparisons are unavailable instead of reported as zero.
- [ ] Editing history names or deleting a record still targets only the intended record.

**Verification:**

- [ ] Session-journal tests cover legacy-to-legacy, summary-to-summary,
  mixed-shape, tracked-rep, and untracked-rep comparisons.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Signed iOS build, install-over-existing, launch, and device history review succeed.

**Dependencies:** Task 4

**Files likely touched:**

- `src/domain/sessionJournal.ts`
- `src/domain/sessionJournal.test.ts`
- `src/screens/HistoryScreen.tsx`

**Estimated scope:** Medium — 3 files

## Task 6: Make analytics explicit about partial volume — Complete

**Description:** Count summary working sets and weight progress while excluding
untracked reps from volume, rep records, and rep-based progress. Surface
partial-volume state in analytics instead of displaying a partial sum as a
complete workout total.

**Acceptance criteria:**

- [ ] Session and working-set counts include valid summary logs; warm-up counts
  do not fabricate sets for summary records.
- [ ] Max weight can use summaries, but max reps, estimated volume, and
  rep-dependent records require explicitly tracked reps.
- [ ] Mixed legacy/summary ranges visibly distinguish complete volume from
  partial or unavailable volume in all affected analytics copy.

**Verification:**

- [ ] Analytics tests cover legacy-only, tracked-summary, untracked-summary,
  mixed ranges, bodyweight, and prior-period comparisons.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Signed iOS build, install-over-existing, launch, and device analytics review succeed.

**Dependencies:** Tasks 4 and 5

**Files likely touched:**

- `src/domain/analytics.ts`
- `src/domain/analytics.test.ts`
- `src/screens/AnalyticsScreen.tsx`

**Estimated scope:** Medium — 3 files

## Task 7: Harden coaching, recovery, and workflow integration

**Description:** Prevent coaching and progression from drawing rep conclusions
from untracked summaries, then verify Focus Mode across resume, backgrounding,
partial finish, exercise add/replace/remove/reorder, special load suggestions,
and accessibility. Existing superset metadata is preserved but receives no new behavior.

**Acceptance criteria:**

- [ ] Weight history can update future defaults, but rep-based increase,
  plateau, and volume recommendations require explicitly tracked reps.
- [ ] Focus, entered values, completion state, and workout order survive
  backgrounding and app relaunch; repeated finish actions cannot create duplicates.
- [ ] Existing add, replace, remove, reorder, deload, and special working-load
  suggestions remain safe without restoring per-set logging or changing superset behavior.

**Verification:**

- [ ] Coaching and training tests cover untracked reps, mixed history, resume,
  partial finish, repeat actions, and edited workouts.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Signed release build installs over the existing app and launches successfully.
- [ ] Physical-device checks cover one-handed use, smallest width, VoiceOver,
  Dynamic Type, background/resume, force-quit/resume, editing actions, and preserved history.
- [ ] Focused code review finds no data-integrity, accessibility, or unrelated-change regressions.

**Dependencies:** Tasks 3–6

**Files likely touched:**

- `src/domain/coaching.ts`
- `src/domain/coaching.test.ts`
- `src/domain/training.ts`
- `src/domain/training.test.ts`
- `App.tsx`

**Estimated scope:** Medium — 5 files

## Checkpoint: Initiative complete

- [ ] All acceptance criteria are satisfied.
- [ ] Full tests and TypeScript checks pass.
- [ ] Release build uses the existing bundle identifier and Personal Team signing.
- [ ] Updated app installs without uninstalling or resetting storage.
- [ ] Application launches successfully on the connected iPhone.
- [ ] Existing and new workout history are intact and accurately represented.
- [ ] The user approves the real-workout Focus Mode interaction.
