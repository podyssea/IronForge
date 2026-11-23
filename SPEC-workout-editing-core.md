# Spec: Workout Editing Core

Module ID: `workout-editing-core`
Initiative map: [CAPABILITY_MAP.md](./CAPABILITY_MAP.md)

## Objective

Create a reusable, accessible workout-editing foundation for two later
experiences:

1. changing one exercise only for an active session; and
2. reviewing and adjusting a generated multi-workout split draft.

The editor must make scope visible and enforce it in its interface. It edits an
in-memory workout draft and reports the updated draft to its owner. It must not
write to the saved routine, active session, workout history, or storage by
itself.

### Primary user

A person who follows a routine for several months, occasionally substitutes an
exercise for variety or availability, and periodically reviews a generated new
training split.

### User experience contract

- The user always sees whether they are editing **Today's workout** or a
  **New split draft**.
- The workout's exercises appear in their programmed order with exercise name,
  primary muscles, equipment, sets, and rep target visible without opening an
  advanced settings panel.
- Each exercise exposes direct actions to replace and reorder it. Removing an
  exercise is available but visually secondary and requires confirmation.
- Adding an exercise is a single, clearly labelled action at the end of the
  workout list.
- Replacement opens a focused picker rather than expanding a long control list
  inside the workout card.
- Suggested replacements appear before the full library. Search remains
  available by exercise name, primary muscle, equipment, and movement pattern.
- Choosing a replacement returns directly to the editor and shows the result
  in the same list position.
- The user can cancel an editing flow without mutating its source workout.

### Editing rules

- All editing operations return new values and do not mutate the supplied
  source workout.
- Replacing an exercise preserves its list position, target set count, rep
  range, rest duration, and superset position.
- If prior performance exists for the replacement exercise, its latest valid
  loading configuration and best valid working load seed the replacement.
  Otherwise, its load starts safely at zero.
- Completed or invalid sets are never copied into a draft as completed.
- A workout cannot contain the same exercise identifier twice.
- A workout must always contain at least one exercise.
- Removing or reordering one member of a superset must leave valid, adjacent
  superset pairs; otherwise the affected pair is safely dissolved.
- Reordering treats a valid superset pair as one block.
- Editor actions never alter completed `SessionRecord` values.

## Tech Stack

- React Native `0.81.5`
- React `19.1.0`
- Expo `~54.0.36`
- TypeScript `~5.9.2`
- Vitest `^4.1.10`
- Local exercise catalogue and AsyncStorage-backed application state
- iOS portrait interface using the existing Xcode workspace and automatic
  signing configuration

No new runtime dependency is required or allowed for this module without prior
approval.

## Commands

Run from the repository root:

```sh
npm test
npx tsc --noEmit
npx expo start
xcodebuild -workspace ios/GymJournal.xcworkspace -scheme GymJournal -configuration Release -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/IronForgeWorkoutEditingBuild build
```

Physical-device installation and launch must follow the repository's mandatory
deployment workflow after code changes. The existing bundle identifier,
automatic signing settings, and installed application data must be preserved.

## Project Structure

```text
App.tsx                              Application state and persistence ownership
src/components/WorkoutEditor.tsx    Shared workout editing surface
src/components/ExercisePicker.tsx   Focused suggestions, filters, and search
src/components/ExerciseEditorRow.tsx Exercise summary and direct edit actions
src/domain/training.ts              Pure workout-editing operations
src/domain/exerciseLibrary.ts       Exercise metadata and substitution data
src/domain/training.test.ts         Domain integrity and editing-rule tests
src/components/*.test.tsx           UI tests if a supported RN renderer exists
```

Names are expected locations, not permission to create unnecessary layers. If
the existing `InlineExercisePicker` can be evolved cleanly into the specified
picker, it should be reused or renamed instead of duplicated.

## Code Style

Use typed, immutable transformations and keep persistence outside presentational
components:

```ts
type WorkoutEditorProps = {
  scope: "session" | "split-draft";
  workout: Workout;
  onChange: (workout: Workout) => void;
  onCancel: () => void;
};

export function replaceExerciseInDraft(
  workout: Workout,
  exerciseId: string,
  replacement: ExerciseDefinition,
  records: SessionRecord[],
): Workout {
  // Return a new workout; never persist or mutate the source here.
}
```

- Use descriptive domain names and explicit union types for editing scope.
- Prefer pure functions for add, replace, remove, and reorder rules.
- Keep components focused; avoid adding more workflow state to `App.tsx` than
  the minimum integration state.
- Use `let` only where reassignment is necessary and never force unwrap values.
- Handle invalid or missing exercise identifiers as safe no-ops with test
  coverage.
- Reuse the existing semantic palette and spacing rhythm; do not introduce a
  parallel theme system in this module.

## Accessibility and Interaction Requirements

- All interactive controls have at least a 44×44 point effective touch target.
- Icon-only controls include a meaningful accessibility label and button role.
- Scope, selected state, disabled state, and destructive actions are conveyed
  through text or accessibility state, not color alone.
- Text supports iOS font scaling without hiding the exercise name or primary
  action.
- The editor remains usable on the smallest supported iPhone width in portrait.
- Opening the picker moves focus to its title or search field; closing it
  returns focus logically to the originating exercise action where supported.
- Search results provide useful empty-state copy and a clear way back.
- Destructive removal is separated from replace and reorder actions to reduce
  accidental taps during a workout.

## Testing Strategy

### Unit tests

Extend `src/domain/training.test.ts` or add a focused adjacent test file for:

- immutable add, replace, remove, and reorder operations;
- preservation of prescription and list position during replacement;
- restoration of valid historical loading data;
- clearing completed state in edited drafts;
- duplicate-exercise prevention;
- minimum-one-exercise enforcement;
- superset adjacency and block movement;
- safe no-ops for unknown workout or exercise identifiers; and
- proof that the source workout and supplied history records are unchanged.

Add focused tests for replacement ranking:

1. explicit catalogue substitutions;
2. compatible movement pattern and primary muscles;
3. equipment compatibility and user preferences where provided; and
4. deterministic alphabetical fallback.

### Component verification

If the existing test environment supports React Native component rendering,
cover scope labelling, picker opening, search, selection, cancellation, and
disabled/destructive states with component tests. Do not add a UI testing
dependency solely for this module without approval.

On the physical iPhone, manually verify:

- the complete editing flow using one hand;
- VoiceOver labels and reading order;
- large Dynamic Type layouts;
- keyboard appearance, dismissal, and search result selection;
- dark-mode contrast and pressed/disabled states; and
- cancellation without changes.

### Required verification gate

The module is not complete until `npm test`, `npx tsc --noEmit`, the signed iOS
build, installation, and launch all succeed. Test and deployment outcomes must
be reported accurately.

## Boundaries

### Always

- Operate on a draft and require the owning workflow to decide when to persist.
- Preserve stable workout and exercise identifiers where their entities remain
  the same.
- Preserve workout history and the currently active split.
- Validate draft invariants before returning changes.
- Provide loading, empty, and error-safe UI states where applicable.
- Run relevant tests, type checking, build, installation, and device launch
  after implementation.

### Ask first

- Any persistence schema or migration change.
- Adding or replacing a package.
- Changing workout, exercise, or session identifier semantics.
- Changing signing, entitlements, bundle identifier, or deployment target.
- Introducing drag-and-drop if it requires a dependency or reduces accessible
  alternatives.

### Never

- Mutate completed workout history.
- Persist editor changes implicitly.
- Update the saved routine while applying a session-only edit.
- Delete the final exercise from a workout.
- Reset storage, uninstall the existing app, or erase application data.
- Copy completed-set state into a newly edited workout draft.
- hide destructive actions behind unlabeled icons or color-only meaning.

## Success Criteria

1. One shared editor can render and modify either a session workout draft or a
   split workout draft without containing persistence logic.
2. The editing scope is visibly labelled and available to assistive technology.
3. A user can add, replace, remove, and reorder exercises through clear,
   accessible controls.
4. Replacement suggestions are deterministic, relevant, and searchable across
   name, muscle, equipment, and movement pattern.
5. Replacement retains the programmed slot and prescription while restoring
   safe prior loading data when available.
6. Domain tests prove source workouts and completed history are not mutated.
7. Duplicate exercises, empty workouts, invalid supersets, and unknown IDs are
   handled safely.
8. The editor works at the smallest supported iPhone width and with large
   Dynamic Type without blocking primary actions.
9. Existing domain tests continue to pass.
10. The module passes type checking and the mandatory signed physical-device
    deployment workflow without changing bundle identity or application data.

## Open Questions

None. The user has approved the module boundaries, build order, offline-first
constraint, explicit activation requirement, and preservation of the existing
React Native/Expo implementation.
