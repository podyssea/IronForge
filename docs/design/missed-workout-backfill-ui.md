# UI Design: Missed Workout Backfill

Confirmed concept: [`docs/ideas/missed-workout-backfill.md`](../ideas/missed-workout-backfill.md)

Interface contract: [`docs/design/missed-workout-backfill-interfaces.md`](./missed-workout-backfill-interfaces.md)

Implementation plan: [`tasks/missed-workout-backfill-plan.md`](../../tasks/missed-workout-backfill-plan.md)

## Design Contract

### Screen job

Reconstruct a missed workout accurately from known values, on its real calendar
date, in under one minute.

### Primary action

**Save missed workout** after confirming the date, source, completed-set count,
and any exceptions.

### Experience principles

- Treat backfill as journal work, not live training.
- Assume copied values are mostly correct; optimize for editing exceptions.
- Keep the selected date visible at every step.
- Show exactly how many sets will be saved before committing.
- Use one prominent lime action per view.
- Keep secondary actions visible but visually quiet.
- Never communicate completion, validation, or selection by color alone.

### Patterns to reject

- A calendar dashboard or missing-day detector.
- A second copy of the live workout screen.
- Rest timers, readiness, recommendations, exercise replacement, or set
  reordering.
- A modal for every step.
- Dense four-column tables that require horizontal scrolling.
- Automatic save or a destructive-looking save action.
- A generic card grid, gradients, shadows, or a new visual theme.

## Design Evidence

The design follows the existing GymJournal interface: dark `#101311`
background, `#1a1f1a` surfaces, lime `#d8ff38` primary actions, compact uppercase
labels, 7–10 point corner radii, and flat borders rather than shadows.

It also applies current Apple guidance:

- A custom button needs at least a 44×44-point hit region, a visible press
  state, and a clear text label when text communicates the action best. One or
  two prominent actions per view are preferable to many competing primary
  controls. See [Apple HIG: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons).
- Important content should follow top-to-bottom reading order, related items
  should align and group clearly, and progressive disclosure should reduce
  initial density. Layouts must adapt when Dynamic Type makes horizontal
  arrangements too tight. See [Apple HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout).
- Primary actions are easier to reach in the middle or lower part of an iPhone
  display, and iOS interfaces should adapt to Dark Mode and Dynamic Type. See
  [Apple HIG: Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios/).

The skill-referenced local accessibility checklist was unavailable. This
document therefore uses the repository's accessibility requirements, the
skill's WCAG 2.1 AA baseline, and the official Apple guidance above.

## Information Architecture

```text
History
  └── Log missed workout
        ├── 1. Choose date and source
        │     ├── Planned workout
        │     └── Previous workout
        └── 2. Review and save
              ├── Workout summary
              ├── Collapsed exercise summaries
              ├── Expanded exception editing
              ├── Optional notes
              └── Save summary and action
```

There is no separate success page. A successful save returns to History,
inserts the entry in its chronological position, and announces success.

## Entry Point: History

Place a full-width secondary action immediately below the **History** title and
above aggregate statistics:

```text
WORKOUT JOURNAL
History

┌──────────────────────────────────┐
│ ＋ LOG MISSED WORKOUT            │
│ Add every set on a past date  →  │
└──────────────────────────────────┘

[existing history statistics]
```

### Behavior

- The action remains available when History is empty; backfill is a valid way
  to create the first record.
- When a live session exists, the action remains visible but disabled with the
  text **Finish the active workout before adding a missed one**.
- The whole 52-point row is the hit target.
- Accessibility label: **Log missed workout**.
- Accessibility hint: **Choose a past date and copy a planned or previous workout**.

This is visually secondary to History content: transparent/dark surface, lime
border and label, not a solid lime fill.

## Step 1: Choose Date and Source

### Layout

```text
← BACK TO HISTORY

MISSED WORKOUT
When did you train?
Choose the real workout date.

[ 2026-11-23 ]
[Yesterday] [Today]

START FROM
┌────────────────┬────────────────┐
│ PLANNED        │ PREVIOUS       │
└────────────────┴────────────────┘

[source rows]
```

### Date behavior

- Default to **Yesterday**, the most likely forgotten-workout case.
- Offer small 44-point **Yesterday** and **Today** shortcuts beneath the date.
- Use one clearly labelled `YYYY-MM-DD` field plus the quick shortcuts. This
  supports arbitrary years without an overflowing picker grid.
- Validate calendar rollover and future values when a source is selected and
  on field blur.
- Display the resolved date in natural language below the controls, for
  example **Monday, 23 November 2026**.
- A date error appears directly below the controls and is announced as a live
  region; source choices remain intact.

### Source selector

Use two equal-width text tabs with `accessibilityRole="tab"` and selected
state. **Planned** is the default because it is the shortest path.

At accessibility text sizes, stack the two source choices vertically if their
labels no longer fit comfortably. Do not truncate them.

### Planned source rows

Each current workout is a single 56-point minimum row:

```text
DAY 1
Upper: Horizontal Focus
7 exercises · 24 sets                         →
```

- Preserve programmed order.
- Show title, exercise count, and total sets.
- Do not show coach recommendations or estimated duration.
- Selecting a row immediately creates the draft and opens review; no extra
  Continue button is needed.

### Previous source rows

Each historical record shows:

```text
MON, 16 NOV
Upper: Horizontal Focus
23 completed sets · 8,420 kg                  →
```

- Sort newest-first across all retained history.
- Provide one search field matching workout title and full date so deep
  history is directly reachable without repeated pagination.
- Use the real performed date helper, never raw `completedAt` formatting.
- Show the first 12 rows, followed by a 44-point **Show earlier workouts**
  control that adds the next 12. This avoids a nested virtualized list inside
  the app's existing outer `ScrollView`.
- If there are no historical records, show a useful empty state and keep the
  Planned tab available: **No previous workouts yet. Choose Planned to copy
  your current routine.**
- Long titles wrap to two lines; dates and summaries never overlap.

## Step 2: Review and Save

### Layout

```text
← CHANGE SOURCE

MISSED WORKOUT · MON, 23 NOV 2026
Upper: Horizontal Focus
Copied from Planned Day 1

┌──────────┬───────────────┐
│ 23/24    │ 8,420 kg      │
│ SETS     │ VOLUME        │
└──────────┴───────────────┘

┌──────────────────────────────────┐
│ Incline Smith Press       4/4 ✓ │
│ 35 kg × 8 · 4 sets            ▾ │
└──────────────────────────────────┘

[additional collapsed exercises]

SESSION NOTES (OPTIONAL)
[text input]

23 SETS · MON, 23 NOV 2026
┌──────────────────────────────────┐
│ SAVE MISSED WORKOUT             │
└──────────────────────────────────┘
[Cancel]
```

### Header and summary

- Use a 10-point uppercase kicker for context and a 28-point maximum title,
  slightly smaller than the main History heading.
- Keep the selected date above the fold and repeat it beside the Save action.
- The source subtitle says either **Copied from Planned Day N** or
  **Copied from workout on [date]**.
- Show two summary cells only: completed sets and volume. Duration is absent,
  not zero or estimated.

### Exercise disclosure rows

- All exercises start collapsed.
- The full row is a button with `accessibilityState={{ expanded }}`.
- Collapsed content includes exercise name, completed/total sets, representative
  weight × reps, and the text **Complete** or **Needs review**.
- Completion includes a checkmark and text, not lime color alone.
- Opening one exercise does not automatically close another; this prevents
  losing visual context while correcting several exceptions.
- Preserve exercise and set order from the chosen source.

### Expanded set editor

At compact width, each set uses one 56-point minimum row:

```text
┌──────┬──────────────┬──────────┐
│ ✓ 1  │ 35 kg   ⌄   │ 8 reps ⌄ │
│ WORK │ WEIGHT       │ REPS     │
└──────┴──────────────┴──────────┘
```

- The leading control is a checkbox with an explicit label such as
  **Set 1, working set, completed**.
- Weight and repetition values remain visually dominant; labels remain visible
  at default sizes and accessible through control labels at large sizes.
- Use labelled numeric inputs with decimal-pad/number-pad keyboards so exact
  remembered values outside preset ranges remain representable. Convert
  display units through the existing stored/display weight helpers.
- Weight supports zero for bodyweight exercises. Repetitions must satisfy the
  existing exercise validation rules.
- Invalid rows retain full opacity, use a border plus inline error text, and
  move VoiceOver focus to the first invalid control after a failed Save.
- An unchecked set remains editable but is labeled **Skipped — not included**.
- Provide 44-point **Add set** and **Remove set** actions within each expanded
  exercise. New exercises remain outside the confirmed MVP.

At accessibility text sizes, the row may become a vertical block: set identity
first, followed by two full-width 44-point value controls. Functionality and
reading order remain unchanged.

### Notes

- Keep notes optional and visually secondary after exercises.
- Minimum height 64 points; grow with content rather than clipping.
- Placeholder: **Anything worth remembering about this workout?**
- Keyboard dismissal must not change draft values.

### Save area

- Place the save summary and action after the compact exercise list, in the
  lower, easy-to-reach portion of the flow. It is in normal document flow, not
  an overlay that can cover inputs or conflict with the outer `ScrollView`.
- The summary reads **[N] sets · [date]** and updates immediately.
- The solid lime button is at least 56 points high and spans the content width.
- Default label: **Save missed workout**.
- While saving: disable the button, show **Saving workout…**, and prevent a
  second invocation.
- **Cancel** is a separate 44-point text/border action below Save.
- If nothing changed, Cancel returns immediately. If values, completion, notes,
  set count, source, or date changed, ask **Discard this missed workout?**
  before Cancel, Change Source, or a root-tab switch can leave the flow.

## Feedback and Error States

### Successful save

- Return to History only after the serialized AsyncStorage write resolves.
- Scroll or focus to the newly inserted journal row where supported.
- Announce **Workout saved for [date], [N] sets logged**.
- Use the existing native success alert only if focus/announcement cannot
  provide sufficiently clear confirmation; do not add a success page.

### Active-session conflict

- Entry action is disabled proactively.
- If state changes after entry, Save returns the user to the live workout with
  a blocking message: **Finish your active workout before saving a missed one.**

### Date error

- Inline under date controls.
- Preserve the chosen source tab and list position.

### Set error

- Inline under the affected set row.
- Save summary shows **Fix 1 set before saving**.
- Move focus to the first invalid value.

### No completed sets

- Keep the draft.
- Show **Mark at least one set complete to save this workout** above Save.

### Record identifier conflict

- Keep the draft and block further save attempts.
- Show a non-destructive integrity message with a return to History; never
  overwrite the existing record.

### Storage failure after insertion

- Keep the draft open, show the existing persistent app-level storage error
  banner, and offer Save again after storage recovers. Never announce success
  before the write resolves.

## Accessibility Contract

### Semantics and labels

- Step titles use `accessibilityRole="header"`.
- Back and Cancel are explicit text buttons, not unlabeled symbols.
- Source choices expose tab role and selected state.
- Source rows announce workout title, date when applicable, exercise count,
  completed-set count, and volume before the **button** trait.
- Exercise disclosures announce expanded/collapsed state and completion text.
- Set completion uses checkbox role and checked state.
- Weight and rep triggers include exercise, set number, value, and unit in the
  accessibility label.
- Disabled actions expose disabled state and visible explanatory copy.

### Focus behavior

- Entering the flow focuses **When did you train?**.
- Selecting a source focuses the review title.
- Expanding an exercise keeps focus on its disclosure row; the next swipe moves
  into its first set.
- Failed Save focuses the first inline error/control.
- Successful Save focuses the new History row or the History heading.
- Returning from Change Source restores focus to the chosen source row.

Use React Native focus APIs only at screen/step changes and validation failure;
do not steal focus after ordinary value edits.

### Touch, type, and contrast

- All interactive targets are at least 44×44 points; primary Save is 56 points.
- Pressed, selected, disabled, complete, skipped, and error states each have
  text or symbol reinforcement in addition to color.
- Leave `allowFontScaling` enabled. Do not cap text scaling on essential labels.
- Use `minHeight`, wrapping, and vertical reflow instead of fixed text-bearing
  heights.
- Maintain the existing high-contrast dark/lime palette and verify WCAG AA
  contrast for every smaller secondary label during implementation.

## Responsive Rules

The project is iPhone portrait-first, but the flow must remain usable wherever
the existing app can render.

| Condition | Adaptation |
|---|---|
| 320–374 pt width | 16–20 pt page inset; source/date rows remain full width; long titles wrap; no horizontal scrolling |
| 375 pt and wider | Existing 20 pt page inset and spacing rhythm |
| Accessibility text sizes | Horizontal tabs and set controls may stack vertically; the date input is full width; containers grow; no clipped labels |
| Short vertical space / keyboard | Save remains in scroll flow; keyboard can dismiss interactively; no covered focused input |
| Landscape or resizable window | Center content with a practical max width; preserve the same order and capabilities |

## Visual Tokens

Reuse the existing values rather than introducing a theme layer solely for
this feature:

| Purpose | Existing value/pattern |
|---|---|
| App background | `#101311` |
| Primary surface | `#1a1f1a` |
| Selected/active surface | `#202a1d` to `#26331f` |
| Primary accent/action | `#d8ff38` |
| Primary text | `#f3f5f1` to `#f8faf5` |
| Secondary text | `#8d958c` to `#aab3a7` |
| Neutral border | `#566052` to `#687166` |
| Error text/border | Existing muted red family around `#d78073` / `#8b4e44` |
| Radius | 7–10 pt, matching existing cards and controls |
| Spacing rhythm | 4, 8, 12, 16, 20, 24 pt |

Use semantic style names inside new components (`surface`, `primaryAction`,
`errorText`) even though the current app stores values in local StyleSheets.
Do not create a parallel runtime theme system as part of this feature.

## Component Boundaries

Keep every new component below roughly 200 lines by separating responsibilities:

```text
MissedWorkoutFlow
  ├── date controls and source tabs
  ├── source-row pagination
  └── step state and error routing

MissedWorkoutEditor
  ├── review header and totals
  ├── notes
  └── save/cancel summary

BackfillExerciseCard
  ├── collapsed disclosure summary
  └── expanded editable set rows
```

`MissedWorkoutFlow` owns navigation state. `MissedWorkoutEditor` is controlled
and persistence-free. `BackfillExerciseCard` receives one exercise and emits
typed set changes; it never sees records, workouts, or storage.

## Performance Rules

- Memoize exercise summaries and option arrays by exercise/value inputs.
- Update only the changed exercise/set in immutable draft state.
- Render previous sources in bounded batches of 12 to avoid a nested
  `VirtualizedList` under the existing root `ScrollView`.
- Avoid volume calculation inside repeated render expressions; compute draft
  totals once per draft change.
- Do not animate every set update. Use only subtle disclosure transitions and
  respect reduced-motion preferences where an animation is added.

## UI Verification Matrix

### Required states

- History with records.
- App state still loading.
- Empty History.
- Backfill disabled by an active session.
- Planned source list.
- Empty previous-source list.
- Long previous-source history with pagination.
- Fully valid prefilled draft.
- Partial draft with skipped sets.
- Invalid date.
- Invalid weight and repetitions.
- No completed sets.
- Saving/duplicate-tap prevention.
- Successful save.
- Identifier conflict.
- App-level storage failure.

### Required device checks

- Smallest supported iPhone portrait width.
- Connected physical iPhone in normal text size.
- Largest practical Dynamic Type/accessibility size.
- VoiceOver reading order, roles, values, and focus restoration.
- Voice Control labels for all primary actions.
- Keyboard appearance, interactive dismissal, and notes persistence.
- One-handed completion of both source paths.
- Dark-mode contrast and visible pressed/disabled/error states.

### Timed usability check

Run both scenarios from History to saved journal row:

1. Planned workout, no set changes.
2. Previous workout, two changed sets and one skipped set.

Both must complete comfortably under one minute. Investigate any step that
needs more than one deliberate action without protecting data integrity.
