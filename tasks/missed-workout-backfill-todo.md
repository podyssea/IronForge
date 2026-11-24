# Task List: Missed Workout Backfill

Plan: [`tasks/missed-workout-backfill-plan.md`](./missed-workout-backfill-plan.md)

Confirmed concept: [`docs/ideas/missed-workout-backfill.md`](../docs/ideas/missed-workout-backfill.md)

Interface contract: [`docs/design/missed-workout-backfill-interfaces.md`](../docs/design/missed-workout-backfill-interfaces.md)

UI design: [`docs/design/missed-workout-backfill-ui.md`](../docs/design/missed-workout-backfill-ui.md)

## Task 1: Add the retrospective record-date contract

**Description:** Extend persisted session records with optional date-only
backfill metadata and add a non-destructive schema migration. Centralize
validation and date resolution so legacy live records continue to use
`completedAt`, while retrospective entries preserve the selected calendar day
exactly and never expose a fabricated time.

**Acceptance criteria:**

- [ ] `SessionRecord` accepts validated `performedOn: YYYY-MM-DD` and
  `entryMode: "backfill"` metadata without requiring it on existing records.
- [ ] The new schema migrates every supported older state without deleting,
  duplicating, or changing existing workout records.
- [ ] Backfill date helpers reject malformed or future calendar dates and
  resolve legacy live-record dates compatibly.

**Verification:**

- [ ] Migration tests cover legacy live records, valid backfills, malformed
  metadata, backup round trips, and unchanged record counts/content.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Signed iOS build, install over the existing app, and launch succeed on
  the connected iPhone with workout history preserved.

**Dependencies:** None; requires approval of the additive persistence change
at the plan review gate.

**Files likely touched:**

- `src/domain/training.ts`
- `src/storage/migrations.ts`
- `src/storage/migrations.test.ts`
- `src/storage/appStorage.ts`
- `src/storage/backup.test.ts`

**Estimated scope:** Medium — 5 files

## Task 2: Preserve full history and make chronology order-independent

**Description:** Stop using the six-week query as a state-retention policy and
route journal grouping, prior-performance comparisons, range analytics,
progress points, and personal-record attribution through shared date sorting.
Older records remain persisted and accessible even when a particular view uses
a bounded reporting range.

**Acceptance criteria:**

- [ ] Loading and saving retain valid records older than six weeks; display or
  analytics ranges filter copies without mutating stored state.
- [ ] Journal comparisons, grouping, progress points, and personal records are
  correct for shuffled input and an older record inserted after newer ones.
- [ ] Multiple workouts on one date are retained and ordered deterministically.

**Verification:**

- [ ] Tests cover full retention across reload, chronological comparisons,
  analytics with shuffled records, same-day entries, and legacy dates.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Signed iOS build, install over the existing app, and launch succeed on
  the connected iPhone; records older than six weeks remain available.

**Dependencies:** Task 1

**Files likely touched:**

- `src/domain/sessionJournal.ts`
- `src/domain/sessionJournal.test.ts`
- `src/domain/analytics.ts`
- `src/domain/analytics.test.ts`
- `App.tsx`

**Estimated scope:** Medium — 5 files

## Task 3: Build immutable backfill draft operations

**Description:** Add a pure retrospective-draft module that creates a new
editable copy from a planned workout or historical session, updates individual
sets and notes immutably, validates the selected date and completed sets, and
converts the draft into a new chronological `SessionRecord` without touching
the source or current routine. Use the interface contract's discriminated
source union and consistent `Result<T, E>` error semantics.

**Acceptance criteria:**

- [ ] Planned and historical sources produce independent drafts whose valid
  sets are prefilled and initially completed, with source order preserved.
- [ ] Editing weight, repetitions, completion, or notes never mutates the
  source workout, source record, or another set; unknown targets return typed
  errors instead of throwing or silently no-oping.
- [ ] Saving creates a new stable identifier, exact `performedOn` date,
  validated volume, no start/duration values, no current-load mutation, and a
  typed validation error for invalid input.

**Verification:**

- [ ] Focused tests cover both source types, skipped/invalid source sets,
  zero-weight exercises, partial workouts, duplicate dates, future-date
  rejection, immutability, and deterministic volume.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Signed iOS build, install over the existing app, and launch succeed on
  the connected iPhone with existing data intact.

**Dependencies:** Tasks 1 and 2

**Files likely touched:**

- `src/domain/workoutBackfill.ts`
- `src/domain/workoutBackfill.test.ts`
- `src/domain/training.ts`

**Estimated scope:** Medium — 3 files

## Checkpoint: Domain and persistence foundation

- [ ] All existing and new tests pass.
- [ ] TypeScript reports no errors.
- [ ] Migration and backup round trips preserve every existing journal entry.
- [ ] Shuffled-history tests prove chronology does not depend on array order.
- [ ] Backfill tests prove planned workouts, source records, and current loads
  remain unchanged.
- [ ] Signed app installs over the existing app and launches successfully.
- [ ] Human review confirms the domain contract before UI implementation.

## Task 4: Deliver planned-workout backfill end to end

**Description:** Add **Log missed workout** to History and deliver the first
complete path: choose a valid past date, choose a current planned workout,
review its pre-completed sets in a compact collapsible editor, edit exceptions,
and save one record. Keep navigation local to the retrospective flow and let
`App.tsx` own only the final record insertion.

**Acceptance criteria:**

- [ ] From History, the user can select any valid non-future date and any
  current planned workout without starting or replacing an active session.
- [ ] The editor exposes every set's weight, repetitions, and completion state,
  plus notes and a clear date/set-count save summary usable on a small iPhone.
- [ ] Saving inserts one chronologically sorted record, returns to History,
  and leaves workouts, suggested loads, active-session state, and existing
  records unchanged; retries are idempotent and identifier reuse with different
  content fails with `RECORD_ID_CONFLICT`.

**Verification:**

- [ ] Domain/integration tests cover save-once behavior, cancellation,
  validation errors, and unchanged routine/active-session state.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Signed iOS build, install, and launch succeed on the connected iPhone.
- [ ] On-device check confirms date selection, collapsed summaries, numeric
  editing, keyboard behavior, partial sets, cancellation, save feedback,
  one-handed use, VoiceOver labels, and large Dynamic Type.

**Dependencies:** Tasks 1–3

**Files likely touched:**

- `src/screens/HistoryScreen.tsx`
- `src/components/MissedWorkoutFlow.tsx`
- `src/components/MissedWorkoutEditor.tsx`
- `src/components/BackfillExerciseCard.tsx`
- `App.tsx`

**Estimated scope:** Medium — 5 files

## Checkpoint: Planned-workout slice

- [ ] Planned backfill works end to end in under one minute using representative data.
- [ ] No live-session controls or synthetic time/duration appear.
- [ ] History, analytics, and current routine remain correct after save and relaunch.
- [ ] Automated checks and signed physical-device deployment pass.

## Task 5: Add previous-entry cloning and complete device proof

**Description:** Extend the same source-selection step with complete retained
history, newest-first. Cloning copies one selected record into the same draft
and editor used by the planned path; the user changes only exceptions and
saves a distinct backfill. Finish accessibility, performance, and data-
preservation verification for both paths.

**Acceptance criteria:**

- [ ] Previous entries display date, workout name, completed sets, and volume;
  selecting one creates an independent draft without changing the source.
- [ ] Planned and previous sources converge on the same editor and save path,
  including partial/legacy records and multiple workouts on one date.
- [ ] Both source paths meet the under-one-minute target on the physical iPhone
  and remain responsive with the full retained history.

**Verification:**

- [ ] Tests cover cloned-source immutability, legacy records, long-history
  ordering, duplicate-day insertion, save-once behavior, and cancellation.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Release device build succeeds with the existing bundle identifier and
  automatic Personal Team signing.
- [ ] Updated app installs without uninstalling, launches successfully, and
  preserves all existing workout history.
- [ ] On-device testing verifies both paths, smallest-width layout, VoiceOver,
  large Dynamic Type, keyboard dismissal, rapid exception editing, and clear
  non-color state communication.

**Dependencies:** Task 4

**Files likely touched:**

- `src/components/MissedWorkoutFlow.tsx`
- `src/components/MissedWorkoutEditor.tsx`
- `src/components/BackfillExerciseCard.tsx`
- `src/screens/HistoryScreen.tsx`

**Estimated scope:** Medium — 4 files

## Checkpoint: Feature complete

- [ ] Every MVP item in `docs/ideas/missed-workout-backfill.md` is satisfied.
- [ ] Both planned and previous-entry backfills save accurately in under one minute.
- [ ] Invalid/future dates and invalid set values cannot be persisted.
- [ ] Backfills affect history, volume, analytics, and chronological comparisons.
- [ ] Backfills never alter the current routine's prescribed loads.
- [ ] Complete history survives app relaunch, backup round trip, build install,
  and launch without an uninstall or data reset.
- [ ] All tests, TypeScript checks, release build, signing, installation,
  launch, accessibility checks, and focused code review pass.
