# Implementation Plan: Exercise Focus Logging

Idea brief: [`docs/ideas/exercise-focus-logging.md`](../docs/ideas/exercise-focus-logging.md)
Task list: [`tasks/exercise-focus-logging-todo.md`](./exercise-focus-logging-todo.md)

## Overview

Replace active-workout per-set entry with Flexible Focus Mode: one exercise is
prominent, its latest working weight and completed working-set count are
prefilled, reps are untracked unless the user explicitly adds them, and one
deliberate action completes the exercise and advances focus. The rest of the
workout remains a compact, selectable queue. Existing workout templates,
completed history, and active-session recovery remain intact.

This initiative changes only active logging and the consumers that must
understand its new summary records. It does not redesign program editing,
remove legacy set history, or add superset behavior.

## Architecture Decisions

### 1. Keep one performance model and identify its meaning

`Exercise.sets` remains the single source of performed exercise data. Reps on
`SetLog` become `number | null`; `null` means deliberately untracked, while
zero remains invalid. A persisted log-format discriminator identifies whether
the rows represent legacy per-set performance or an exercise summary. Summary
rows all carry the same primary working weight and optional representative
reps, and their count is the completed working-set count.

Shared helpers interpret the rows through the explicit format. They reject
inconsistent summary rows and return a discriminated result so untracked reps
cannot accidentally become measured volume. This avoids parallel performance
fields that could disagree about which result is authoritative.

### 2. Reps are untracked by default, never copied as performed data

New exercise summaries prefill only working weight and set count. `reps` starts
absent even when prior history contains reps. If the user explicitly adds a
representative working-set rep count, it is stored. Rep-dependent volume,
progression, comparison, and coaching logic must return unavailable or skip the
exercise when reps are absent; zero must not be used as a fabricated result.

### 3. Make unavailable volume unrepresentable as a total

Legacy records retain their measured numeric volume. New summary records store
`volume: null` whenever any completed exercise has untracked reps. Consumers
must branch on `number | null`; they may not display a partial sum as the full
workout volume.

### 4. Seed from latest valid normal performance

Starting a workout searches newest-to-oldest completed, non-deload history for
each exercise. It seeds weight and completed working-set count from a valid
summary or legacy working-set performance, then falls back to the current
workout prescription. A zero load remains valid for bodyweight exercises and
is displayed as `Bodyweight`, not as missing data.

### 5. Focus is guided but not enforced

The active screen renders one focused exercise with large weight, set-count,
optional-reps, and completion controls. All other exercises remain compact and
selectable. Completion advances to the next unfinished exercise; the user may
jump out of order and may reopen completed exercises without losing values.
Existing add, replace, remove, and reorder actions remain reachable but
secondary.

### 6. Supersets are outside this initiative

No new superset UI, paired completion, paired focus, or superset-specific
rules are introduced. Existing persisted superset metadata is preserved and
the summary logger treats exercises independently.

## Dependency Graph

```text
Task 1: nullable-rep contract and format-aware compatibility helper
    │
    ├── Task 2: schema-v16 format expansion and migration proof
    │       │
    │       └── Task 3: history-seeded active-session summary flow
    │               │
    │               └── Task 4: focused exercise UI and compact queue
    │                       │
    │                       ├── Task 5: honest history and comparisons
    │                       ├── Task 6: honest analytics and partial volume
    │                       └── Task 7: coaching, resume, and workflow hardening
    │
    └── Legacy set logging remains readable throughout
```

Tasks 5 and 6 are conceptually independent after Task 4, but implementation
will remain sequential because both consume the shared training contract and
every code change requires a signed physical-device deployment.

## Task List

### Phase 1: Additive data foundation

- [x] Task 1: Define the nullable-rep contract and compatibility helper.
- [x] Task 2: Expand persisted state to schema v16 without rewriting history.

### Checkpoint: Data safety

- [x] Legacy and new state round-trip without losing workout data.
- [x] Tests, type checking, signed build, installation, and launch pass.
- [ ] Existing workout history remains visible on the physical iPhone.

### Phase 2: Core logging slice

- [x] Task 3: Start, update, complete, reopen, and finish summary-based exercises.
- [x] Task 4: Deliver Flexible Focus Mode and the compact workout queue.

### Checkpoint: Core experience

- [x] A complete workout can be logged exercise by exercise without per-set interaction.
- [x] Out-of-order selection and correction work without data loss.
- [x] Tests, type checking, signed build, installation, and launch pass.

### Phase 3: Honest downstream behavior

- [x] Task 5: Render summary history and comparisons without invented reps.
- [x] Task 6: Adapt analytics and volume presentation to partial data.
- [ ] Task 7: Harden coaching, recovery, editing actions, and accessibility.

### Checkpoint: Complete

- [ ] Existing legacy history and new summary history are both correct.
- [ ] Rep-dependent outputs never treat untracked reps as zero or measured data.
- [ ] One-handed, VoiceOver, Dynamic Type, resume, and data-preservation checks pass.
- [ ] The signed app installs over the existing app and launches on the connected iPhone.
- [ ] The focused diff receives code review before implementation is considered complete.

## Verification Policy

Every task that changes application code must finish with:

```sh
npm test
npx tsc --noEmit
xcodebuild -workspace ios/GymJournal.xcworkspace -scheme GymJournal -configuration Release -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/IronForgeExerciseFocusBuild build
```

The signed build must then be installed over the existing application and
launched on the connected iPhone using the existing Personal Team, bundle
identifier, and automatic signing. The existing app must not be uninstalled,
and storage must not be reset. Focused tests may run earlier but do not replace
this gate.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Optional reps silently corrupt volume or progression | High | Summary reps are absent by default; shared helpers return unavailable; tests cover every rep-dependent consumer |
| Schema validation rejects an active workout after upgrade | High | Add v16 support before activating summary writes; test v15-to-v16 migration and active-session round trips |
| Existing history is rewritten or reclassified | High | Additive field only; migration preserves legacy set arrays byte-for-byte |
| Partial numeric volume is mistaken for complete volume | High | Store `null` for unavailable summary volume and require consumers to handle it |
| Focus Mode becomes rigid when equipment is occupied | Medium | Keep the compact queue selectable and preserve existing move/replace actions |
| Reopening an exercise duplicates completion or loses values | High | Use idempotent summary update/complete/reopen helpers with focused tests |
| Bodyweight exercises look like invalid zero-weight entries | Medium | Treat zero as valid and render modality-aware `Bodyweight` copy |
| Current deadlift calculator conflicts with one-weight summaries | Medium | Preserve its suggested working load as a seed only; do not persist generated warm-up/ramp sets as performed data |
| Active-session autosave races with rapid focus changes | Medium | Keep one state update per action and verify persisted resume state after background/termination |
| Scope expands into superset or full program redesign | Medium | Preserve metadata but add no superset logic; keep program editing and general redesign explicitly out of scope |

## Rollback Strategy

- Schema v16 adds explicit log-format metadata and permits `null` reps only in
  summary rows. Legacy v15 rows remain readable and migrate as legacy format.
- Rolling back application code after new summary records exist is unsafe
  because v15 cannot represent deliberately untracked reps. Rollback means
  restoring the v16-capable build; no lossy down-conversion is performed.
- UI integration is isolated to active workouts. If Focus Mode fails device
  verification, the release can return to the existing active card while the
  additive stored fields remain harmless.
- No storage reset, destructive migration, identifier change, bundle change,
  or dependency addition is planned.

## Open Questions Resolved for Planning

- Optional reps mean one representative working-set rep count, not a note.
- Completion requires at least one set, a finite non-negative weight, and—when
  supplied—a positive integer rep count.
- Bodyweight with zero external load is valid and displayed as `Bodyweight`.
- Warm-ups and multiple intra-exercise weights are not recorded.
- Superset behavior is ignored; existing metadata is preserved only.

## Review Gate

Implementation begins only after the user explicitly approves this plan and
the linked task breakdown.
