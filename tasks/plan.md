# Implementation Plan: Workout Editing Core

Approved specification: [`SPEC-workout-editing-core.md`](../SPEC-workout-editing-core.md)
Capability map: [`CAPABILITY_MAP.md`](../CAPABILITY_MAP.md)
Task list: [`tasks/todo.md`](./todo.md)

## Overview

Build the shared workout-editing foundation as five small, sequential slices.
Start with immutable domain operations and deterministic exercise suggestions,
then build the picker and editor UI, and finally prove the complete editor on
the app's existing temporary-plan draft path. That path is the safest runtime
integration because it already keeps the permanent routine separate.

This module does not yet implement the session-only two-tap swap or the full
multi-month split-renewal journey. It establishes and verifies the shared
contract those modules will consume.

## Architecture Decisions

### 1. Single-workout draft API

Introduce pure operations that accept one `Workout` and return a new `Workout`.
Keep the existing workout-array helpers as compatibility wrappers until later
modules migrate their callers. This reduces accidental cross-workout mutation
and gives the editor a narrow contract.

### 2. Explicit scope, no persistence in UI components

`WorkoutEditor` receives an explicit `session` or `split-draft` scope and edits
an isolated working value. It emits a committed workout to its owner; it does
not access AsyncStorage or global application state. Cancellation discards the
working value.

### 3. Deterministic local recommendations

Exercise ranking is a pure local function. It ranks explicit substitutions
first, then compatible movement/muscle/equipment options, then deterministic
alphabetical fallback. Excluded and duplicate exercises are removed before
ranking. Search uses the same catalogue metadata and requires no network.

### 4. Accessible controls before drag-and-drop

Use labelled move-up and move-down controls with 44-point touch targets. This
is predictable with VoiceOver and requires no dependency. Drag-and-drop is not
part of this module.

### 5. Existing temporary draft as the integration path

The first runtime use of `WorkoutEditor` is editing a workout inside an
existing temporary-plan draft. The editor works on a local copy and commits
only after an explicit save. The permanent routine and completed history remain
unchanged. Direct routine editing from the Log screen is not introduced.

## Dependency Graph

```text
Task 1: immutable workout draft operations
    ├── Task 2: exercise candidate ranking and search
    │       └── Task 3: focused exercise picker
    └──────────────────┬─────────────────────────┘
                       ▼
              Task 4: shared workout editor
                       ▼
       Task 5: temporary-draft integration and device proof
```

The tasks are sequential because later UI slices consume contracts created by
earlier tasks. No parallel implementation is planned for this module.

## Implementation Phases

### Phase 1: Data-integrity foundation

- Task 1 creates and tests immutable single-workout operations.
- Task 2 creates and tests deterministic replacement ranking and search.
- Checkpoint: all domain tests and TypeScript checks pass before UI work.

### Phase 2: Reusable editing UI

- Task 3 replaces the long inline picker experience with a reusable focused
  picker while preserving compatibility with current callers.
- Task 4 composes accessible exercise rows and the scope-labelled editor.
- Checkpoint: type checking, tests, iOS build, installation, and launch succeed.

### Phase 3: Safe runtime integration

- Task 5 connects the editor only to existing temporary-plan drafts, using an
  explicit save/cancel boundary.
- Final checkpoint: all acceptance criteria, physical-device interaction,
  accessibility, signing, installation, launch, and data-preservation checks
  pass.

## Verification Policy

Every implementation task that changes application code ends with:

```sh
npm test
npx tsc --noEmit
xcodebuild -workspace ios/GymJournal.xcworkspace -scheme GymJournal -configuration Release -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/IronForgeWorkoutEditingBuild build
```

The resulting signed application must then be installed and launched on the
connected iPhone without uninstalling the existing app. Existing workout data,
the bundle identifier, signing settings, and entitlements must be preserved.
Focused tests may run earlier in a task, but they do not replace this gate.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Current active-session replacement also updates the saved routine | High | New draft operations contain no persistence; session integration remains outside this module and later receives dedicated tests |
| Existing helpers accept an entire workout array | Medium | Add narrow single-workout functions first and retain tested compatibility wrappers |
| Superset membership becomes invalid after edits | High | Centralize invariant normalization and test remove, replace, and block movement |
| Exercise suggestions feel arbitrary | Medium | Define deterministic ranking tiers and expose metadata in picker results |
| Long exercise library performs poorly in a nested scroll view | Medium | Use one focused picker surface, memoized filtering, and bounded result rendering appropriate to the existing dependency set |
| Large text obscures editing actions | Medium | Use wrapping layouts, visible text actions, minimum touch targets, and physical-device Dynamic Type checks |
| Temporary draft changes leak into the permanent routine | High | Edit a local workout copy and commit only to the identified temporary-plan draft after explicit save |
| App state in `App.tsx` grows more complex | Medium | Limit integration state to editor entry/exit and keep domain/UI logic in focused files |

## Rollback Strategy

- Domain functions are additive and existing wrappers remain available.
- The existing `InlineExercisePicker` caller contract remains usable until the
  focused picker is verified.
- Temporary-plan integration is isolated behind its existing draft state. If
  the UI integration fails verification, the editor entry can return to the
  current draft display without changing stored workout data.
- No schema migration, storage reset, or identifier change is planned.

## Open Questions

None. New dependencies, persistence changes, drag-and-drop, signing changes,
or identifier changes remain explicit approval gates.

## Review Gate

Implementation begins only after the user explicitly approves this plan and
the linked task breakdown.
