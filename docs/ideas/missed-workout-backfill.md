# Missed Workout Backfill

## Problem Statement

How might we let a user reconstruct every set from a missed workout on any past date in under one minute, without corrupting workout history or current progression?

## Recommended Direction

Add a retrospective **Log missed workout** flow in History:

`Choose date → Planned or Previous workout → Review sets → Save`

The user can start from either the current routine or a previous journal entry. IronForge prefills and marks every set as completed; the user edits only what differed. Both sources use one compact confirmation editor.

Backfills become normal chronological history records but never become active sessions. They have no rest timer, live-session status, or invented duration. Saving an older performance must not overwrite current programmed loads.

## Key Assumptions to Validate

- [ ] Prefilled values are usually close enough that only a few sets need editing.
- [ ] A complete workout can be reviewed and saved in under one minute.
- [ ] A compact set editor remains readable and easy to operate on a small iPhone.
- [ ] Pre-completing sets is safe when the final set count is clearly summarized.
- [ ] Users understand that backfills update history and analytics but not current suggested loads.

## MVP Scope

- **Log missed workout** action in History.
- Selection of any valid past calendar date.
- Source selection:
  - A planned workout from the current routine.
  - A previous journal entry.
- One compact editor containing every exercise and set.
- Sets prefilled and initially marked completed.
- Editing of weight, repetitions, and completion state.
- Optional session notes.
- Final summary showing workout date and number of completed sets.
- One deliberate Save action.
- Records stored and displayed in chronological order.
- Historical comparisons recalculated using actual workout dates.
- Full journal retention beyond the current six-week restriction.
- Backfilled records excluded from direct current-load updates.
- Existing local workout data preserved.

## Not Doing (and Why)

- **Live rest timers or active-session recovery** — retrospective entry is not a live workout.
- **Fabricated start time or duration** — unknown values should remain unavailable.
- **Calendar gap detection** — requires scheduling assumptions that do not improve core backfilling.
- **Automatic workout detection** — unnecessary for a personal, explicit flow.
- **Future-dated workouts** — creates misleading history.
- **Automatic changes to the current program** — an old performance must not regress current loads.
- **New exercise creation inside backfill** — adds complexity unrelated to rapid reconstruction.
- **Editing existing historical sets** — valuable later, but distinct from logging a missing workout.

## Data Integrity Rules

- Never mutate the source planned workout or cloned journal entry.
- Generate a new stable identifier for every backfill.
- Preserve the selected workout date exactly.
- Permit multiple workouts on the same date.
- Validate every weight and repetition before saving.
- Exclude incomplete or invalid sets from volume and progression calculations.
- Sort records by actual workout date after insertion.
- Never discard older records because they fall outside a display window.
- Use filtering only for views or analytics that intentionally cover a limited period.

## Open Questions

- Should the selected date represent only the calendar day, with no displayed time?
- Should cloning search all historical workouts or initially show recent matching entries?
- Should exercises be collapsible in the compact editor, with completed summaries visible when collapsed?
