# Implementation Plan: Missed Workout Backfill

Confirmed concept: [`docs/ideas/missed-workout-backfill.md`](../docs/ideas/missed-workout-backfill.md)

Interface contract: [`docs/design/missed-workout-backfill-interfaces.md`](../docs/design/missed-workout-backfill-interfaces.md)

UI design: [`docs/design/missed-workout-backfill-ui.md`](../docs/design/missed-workout-backfill-ui.md)

Task list: [`tasks/missed-workout-backfill-todo.md`](./missed-workout-backfill-todo.md)

## Overview

Build a retrospective History flow that lets the user select any past calendar
date, seed a workout from either the current plan or a previous journal entry,
edit exceptions in a compact set grid, and save a chronologically correct
record in under one minute. Backfills are journal records, never active
sessions: they do not run timers, fabricate duration, or update the current
routine's working loads.

The implementation starts with record-date and retention integrity because the
current app prunes state to six weeks and several calculations assume records
are already newest-first. Once chronology is source-order-independent, the
feature adds a pure backfill draft contract and then delivers the planned and
previous-workout paths through one shared UI.

## Architecture Decisions

### 1. Preserve the calendar date explicitly

Add optional, additive `performedOn: YYYY-MM-DD` and
`entryMode: "backfill"` metadata to `SessionRecord`. Existing live records keep
using `completedAt`; shared date helpers prefer `performedOn` when present.
Backfills also receive a compatible `completedAt` value derived at local noon,
but the UI never presents that synthetic time. This avoids timezone-driven day
changes while preserving compatibility with existing consumers and backups.

This is a persistence-model change. It is non-destructive and retains every
existing record, but implementation must not begin until plan approval also
approves the additive schema migration.

### 2. Separate retention from presentation windows

Keep every valid `SessionRecord` in app state and AsyncStorage. Six-week or
other time windows remain query functions used only by views and analytics;
they must never trim persisted state. History and clone-source selection can
therefore reach any retained workout.

### 3. Make chronology explicit at every boundary

Create shared performed-date and sorting helpers. Record insertion, journal
grouping, comparisons, analytics progress, and personal-record attribution use
those helpers instead of trusting array position. Multiple workouts on one day
remain valid, with a deterministic identifier tie-breaker.

### 4. Use a pure backfill draft contract

Introduce a small domain model that owns selected date, source identity,
notes, and copied exercises. Planned and previous-record sources both create
new immutable drafts with all valid sets initially completed. Converting a
draft to a record validates the date and sets, generates a new identifier, and
does not mutate its source.

### 5. Keep retrospective UI independent from active sessions

History owns the entry point and backfill-flow navigation. `App.tsx` owns the
final state insertion and persistence. Saving never calls
`applySessionPerformance`, never creates `ActiveSession`, and is unavailable
while a live session is active.

### 6. No date-picker dependency

Use the existing `NumberPicker` pattern for year, month, and day, constrained
to valid non-future dates. This keeps the feature offline, avoids a new runtime
package, and supports arbitrary past dates. Previous entries are shown
newest-first across the complete retained journal.

### 7. Optimize the editor for confirmation, not live logging

Exercises are collapsed initially with completed-set and volume summaries.
The user expands only exercises that differ from the source, edits weight,
repetitions, or completion, and saves from a persistent summary showing the
chosen date and total sets. Live-only controls such as rest, replacement,
reordering, and progression guidance are excluded.

## Dependency Graph

```text
Task 1: additive record-date schema
    │
    ▼
Task 2: full retention and chronology-safe consumers
    │
    ▼
Task 3: immutable backfill draft and record creation
    │
    ▼
Task 4: planned-workout backfill end to end
    │
    ▼
Task 5: previous-entry cloning and final device proof
```

The implementation is intentionally sequential. Each UI slice depends on the
record and draft contracts established before it; parallel changes to those
contracts would create avoidable integration risk.

## Task List

### Phase 1: Data-integrity foundation

- [ ] Task 1: Add the retrospective record-date contract
- [ ] Task 2: Preserve full history and make chronology order-independent
- [ ] Task 3: Build immutable backfill draft operations

### Checkpoint: Domain and persistence foundation

- [ ] Migration, retention, chronology, analytics, and backfill-domain tests pass
- [ ] Existing workout records survive round-trip migration unchanged
- [ ] TypeScript and the signed physical-device deployment gate pass
- [ ] Review domain contracts before UI work begins

### Phase 2: Complete feature slices

- [ ] Task 4: Deliver planned-workout backfill end to end
- [ ] Task 5: Add previous-entry cloning and complete device UX verification

### Checkpoint: Feature complete

- [ ] Both source paths save through the same editor
- [ ] Backfills appear on the selected date and do not change current loads
- [ ] All automated checks and physical-device checks pass
- [ ] Existing workout history remains present after installation and launch

## Verification Policy

Every task that changes application code must run:

```sh
npm test
npx tsc --noEmit
xcodebuild -workspace ios/GymJournal.xcworkspace -scheme GymJournal -configuration Release -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/IronForgeMissedWorkoutBackfillBuild build
```

After each successful code change, install the signed build over the existing
app on the connected iPhone and launch it without uninstalling or resetting
data. Verify the existing bundle identifier, Personal Team automatic signing,
and stored workout history remain intact. Focused tests may run earlier but do
not replace this gate.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Older records are currently discarded during load and save | High | Remove retention filtering from state ownership before exposing backfill; test reload and backup round trips with records older than six weeks |
| Inserting an old record changes “previous workout” comparisons | High | Sort by performed date inside shared domain helpers and test shuffled input arrays |
| A backfill regresses current prescribed loads | High | Save only a `SessionRecord`; prohibit calls to `applySessionPerformance` and test routine equality before and after save |
| Date-only values shift across time zones | High | Persist `performedOn` as a calendar string and use it for grouping/display; treat `completedAt` as compatibility metadata only |
| Schema migration loses workout history | High | Use an additive schema version, preserve old records byte-for-byte apart from safe normalization, and cover backup restore |
| Pre-completed sets cause accidental over-reporting | Medium | Show completed-set count and date at save, keep one deliberate save action, and allow each set to be unchecked |
| Compact editor is too dense on a small iPhone | Medium | Collapse exercises by default, reuse proven numeric controls, support Dynamic Type, and verify one-handed use on the physical device |
| Previous-entry list becomes long after full retention | Medium | Sort newest-first, show workout title/date/summary, and keep rendering bounded or lazy without adding a dependency |
| An active session and backfill compete for app state | Medium | Disable backfill entry while a live session exists and explain why in the UI |

## Rollback Strategy

- The schema change is additive; old live records remain valid and readable.
- Backfill components and state are isolated behind the History entry point.
- Saving adds one new record and does not mutate workouts, active sessions, or
  existing records.
- If UI integration fails verification, remove the History entry point while
  retaining the tested chronology and retention corrections.
- Never reset AsyncStorage, uninstall the app, or downgrade persisted data to
  roll back the feature.

## Open Questions

None for implementation. Approval of this plan explicitly includes the
additive `SessionRecord` metadata and storage schema migration described above.

## Review Gate

Implementation begins only after the user reviews and explicitly approves this
plan, its linked task breakdown, interface contract, and UI design. Approval
includes the additive record metadata, version-15 migration, typed error
semantics, idempotent record insertion, and responsive/accessibility behavior
defined by those contracts.
