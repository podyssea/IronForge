# Task List: Workout Editing Core

Specification: [`SPEC-workout-editing-core.md`](../SPEC-workout-editing-core.md)

## Task 1: Establish immutable workout-draft operations

**Description:** Add narrow, pure operations for adding, replacing, removing,
and reordering exercises in one workout. Preserve the existing array-based
functions as compatibility wrappers and centralize draft invariant handling.

**Acceptance criteria:**

- [x] Each operation returns a new workout without mutating its source or
  supplied history.
- [x] Replacement preserves position and prescription, clears completion, and
  restores safe historical loading data where available.
- [x] Duplicate exercises, final-exercise removal, unknown identifiers, and
  invalid superset membership are handled safely.

**Verification:**

- [x] Focused domain tests cover all acceptance criteria and superset block
  movement.
- [x] `npm test` passes.
- [x] `npx tsc --noEmit` passes.
- [x] Signed iOS build, install, and launch succeed on the connected iPhone.

**Dependencies:** None

**Files likely touched:**

- `src/domain/training.ts`
- `src/domain/training.test.ts`

**Estimated scope:** Small — 2 files

## Task 2: Rank and search replacement candidates

**Description:** Add a deterministic local query that excludes duplicates and
unavailable exercises, ranks useful substitutions, and searches catalogue
metadata.

**Acceptance criteria:**

- [x] Explicit substitutions rank before compatible movement/muscle/equipment
  matches, followed by alphabetical fallback.
- [x] Preferred exercises receive a deterministic boost; excluded,
  unavailable, current, and already-programmed exercises never appear.
- [x] Search matches exercise name, muscle, equipment, and movement pattern.

**Verification:**

- [x] Focused tests cover every ranking tier, filtering rule, search field, and
  deterministic tie-breaking.
- [x] `npm test` passes.
- [x] `npx tsc --noEmit` passes.
- [x] Signed iOS build, install, and launch succeed on the connected iPhone.

**Dependencies:** Task 1

**Files likely touched:**

- `src/domain/exerciseRecommendations.ts`
- `src/domain/exerciseRecommendations.test.ts`

**Estimated scope:** Small — 2 files

## Checkpoint: Domain foundation

- [x] All existing and new tests pass.
- [x] TypeScript reports no errors.
- [x] Source workouts and completed history remain byte-for-byte equivalent in
  immutability tests.
- [x] Review the domain API before UI components depend on it.

## Task 3: Build the focused exercise picker

**Description:** Evolve the existing picker into a reusable focused selection
surface with suggested results, full-library search, relevant metadata, and
clear empty/cancel states. Preserve the current caller contract during
migration.

**Acceptance criteria:**

- [x] Suggested replacements are visible before the full alphabetical library.
- [x] Search, selection, cancellation, and empty state are clear with the
  keyboard open or closed.
- [x] Controls expose correct accessibility roles, labels, states, focus order,
  and 44-point effective touch targets.

**Verification:**

- [x] `npm test` passes.
- [x] `npx tsc --noEmit` passes.
- [x] Signed iOS build, install, and launch succeed on the connected iPhone.
- [ ] Manually verify search, keyboard dismissal, VoiceOver labels, empty state,
  and large Dynamic Type on the device.

**Dependencies:** Tasks 1 and 2

**Files likely touched:**

- `src/components/InlineExercisePicker.tsx`
- `src/domain/exerciseRecommendations.ts`

**Estimated scope:** Small — 2 files

## Task 4: Compose the reusable workout editor

**Description:** Create focused exercise-editor rows and a scope-labelled
workout editor that operates on an isolated draft and exposes explicit save and
cancel outcomes.

**Acceptance criteria:**

- [x] The editor visibly and accessibly distinguishes `session` from
  `split-draft` scope.
- [x] Users can replace, add, reorder, and request confirmed removal using
  clear one-handed controls.
- [x] Cancellation discards the working draft and save emits one validated
  workout without persisting it directly.

**Verification:**

- [x] `npm test` passes.
- [x] `npx tsc --noEmit` passes.
- [x] Signed iOS build, install, and launch succeed on the connected iPhone.
- [ ] Manual inspection confirms smallest-width layout, large Dynamic Type,
  44-point targets, and non-color state communication.

**Dependencies:** Tasks 1, 2, and 3

**Files likely touched:**

- `src/components/ExerciseEditorRow.tsx`
- `src/components/WorkoutEditor.tsx`
- `src/components/InlineExercisePicker.tsx`

**Estimated scope:** Medium — 3 files

## Checkpoint: Reusable editor

- [x] Domain tests, full tests, and type checking pass.
- [x] The reusable editor compiles without persistence or global-state imports.
- [x] Signed app installs over the existing app and launches successfully.
- [x] Existing workout data remains present.

## Task 5: Prove the editor on a temporary-plan draft

**Description:** Replace the scattered inline editing controls only when an
existing temporary-plan draft is being edited. Work on a local workout copy,
commit to the identified draft after explicit save, and leave the permanent
routine path unchanged.

**Acceptance criteria:**

- [x] Entering draft editing clearly identifies the plan and selected workout;
  saving updates only that temporary draft.
- [x] Cancelling leaves the temporary draft, permanent routine, active session,
  and completed history unchanged.
- [x] The user can switch draft days and complete add, replace, reorder, and
  confirmed removal without losing prior explicitly saved draft changes.

**Verification:**

- [x] Tests prove saved changes target only the intended temporary plan and
  cancellation changes nothing.
- [x] `npm test` passes.
- [x] `npx tsc --noEmit` passes.
- [x] Signed iOS build, install, and launch succeed on the connected iPhone.
- [ ] On-device testing verifies save, cancel, day switching, search, all edit
  actions, VoiceOver, large Dynamic Type, and preserved routine/history data.

**Dependencies:** Tasks 1–4

**Files likely touched:**

- `App.tsx`
- `src/screens/WorkoutScreen.tsx`
- `src/components/WorkoutEditor.tsx`
- `src/domain/temporaryPlan.test.ts`

**Estimated scope:** Medium — 4 files

## Checkpoint: Module complete

- [x] Every automated success criterion in `SPEC-workout-editing-core.md` is satisfied.
- [x] All tests and TypeScript checks pass.
- [x] Release device build uses the existing bundle identifier and automatic
  Personal Team signing.
- [x] Updated app installs without uninstalling or resetting data.
- [x] Application launches successfully on the connected iPhone.
- [x] Existing permanent routine and workout history are intact.
- [x] Changes receive a focused code review before the next capability begins.
