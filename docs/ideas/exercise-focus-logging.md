# Exercise Focus Logging

## Problem Statement

How might we let a lifter log each exercise in seconds using total working sets and one primary working weight, without requiring interaction between sets or fabricating untracked reps?

## Recommended Direction

Build **Flexible Focus Mode** for active workouts.

IronForge presents one exercise at a time with large controls for:

- Primary working weight
- Number of completed working sets
- Optional reps
- One deliberate completion action: “Complete · 3 sets at 80 kg”

Values are prefilled from the latest valid workout history. Completing an exercise collapses it and advances to the next planned exercise. The remaining workout stays visible as a compact queue, allowing the user to jump to another exercise when equipment or circumstances require it.

Completed exercises can be reopened and corrected. Existing add, remove, replace, and reorder capabilities remain available without dominating the logging interface.

## Key Assumptions to Validate

- [ ] A single working weight represents most exercises accurately enough—verify across several real workouts.
- [ ] Previous weight and set count are usually correct defaults—measure how often either value needs adjustment.
- [ ] Exercise-level logging reduces interaction to a few seconds—test one-handed on the physical iPhone.
- [ ] Optional reps still provide useful history when absent—ensure rep-dependent metrics clearly exclude untracked values.
- [ ] Automatic advancement feels helpful without preventing out-of-order exercise selection.

## MVP Scope

- One focused exercise with a compact workout queue.
- Latest valid weight and working-set count prefilled.
- Large, accessible weight and set-count controls.
- Reps hidden by default but optionally recordable.
- One deliberate exercise-completion action.
- Automatic advancement to the next unfinished exercise.
- Ability to jump to another exercise.
- Ability to reopen and edit completed exercises.
- Clear completed, current, and pending states.
- Backward-compatible persistence for explicitly untracked reps.
- Existing workout-history data preserved.

## Not Doing

- Per-set logging—this is the friction being removed.
- Warm-up tracking—warm-ups do not belong in the summarized record.
- Multiple weights within one exercise—the primary working weight is sufficient.
- Superset functionality—explicitly excluded from this initiative.
- Mandatory reps—IronForge must not invent performance data.
- Rest timers triggered after individual sets—the app no longer knows when each set ends.
- Voice, gesture, or swipe completion—premature and easier to trigger accidentally.
- Broader visual redesign—only the active logging flow changes.
- New progression formulas—existing metrics will be adapted only enough to handle untracked reps honestly.

## Open Questions

- Should optional reps represent a typical working-set value or simply a free-form exercise note?
- Should “Complete Exercise” require at least one set and a valid non-negative weight?
- Should bodyweight exercises show “Bodyweight” rather than forcing a zero-weight value?
