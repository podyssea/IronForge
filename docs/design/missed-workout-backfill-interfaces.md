# Interface Design: Missed Workout Backfill

Confirmed concept: [`docs/ideas/missed-workout-backfill.md`](../ideas/missed-workout-backfill.md)

Implementation plan: [`tasks/missed-workout-backfill-plan.md`](../../tasks/missed-workout-backfill-plan.md)

UI design: [`docs/design/missed-workout-backfill-ui.md`](./missed-workout-backfill-ui.md)

## Purpose

Define the stable internal contracts for retrospective workout entry before
implementation. IronForge is offline-first and has no network API, so the
relevant interfaces are:

- persisted `SessionRecord` metadata;
- date parsing and chronological record queries;
- immutable backfill-draft operations;
- idempotent record insertion; and
- React component boundaries between History, the backfill flow, the editor,
  and application state.

The design makes the safe path the easiest path: UI code cannot update current
loads, draft code cannot persist, and insertion accepts only a validated
backfill record.

## Compatibility Rules

1. Existing `SessionRecord` fields keep their names, types, and behavior.
2. New persisted fields are optional and additive.
3. Absence of `entryMode` continues to mean an ordinary or legacy live entry.
4. `completedAt` remains available to all existing consumers. New chronology
   helpers hide the distinction between timestamp-based and date-only records.
5. Existing callers may continue passing unsorted arrays; public journal and
   analytics functions must produce correct chronological results regardless
   of source order.
6. No runtime dependency, network service, identifier rewrite, or destructive
   migration is introduced.

## Persisted Record Contract

### Additive domain types

```ts
export type CalendarDate = string & {
  readonly __brand: "CalendarDate";
};

export type SessionEntryMode = "backfill";

export type SessionRecord = {
  id: string;
  sourceWorkoutId?: string;
  startedAt?: string;
  completedAt: string;
  performedOn?: CalendarDate;
  entryMode?: SessionEntryMode;
  durationSeconds?: number;
  notes?: string;
  deload?: boolean;
  readiness?: ReadinessCheckIn & {
    score: number;
    level: ReadinessAdjustment["level"];
  };
  workoutTitle: string;
  exercises: Exercise[];
  volume: number;
};
```

`CalendarDate` is always the exact local calendar value `YYYY-MM-DD`. It is
branded only after runtime validation. Serialized JSON contains a normal
string.

For a backfill:

- `entryMode` is `"backfill"`;
- `performedOn` is required;
- `startedAt` and `durationSeconds` are absent;
- `completedAt` is a compatibility timestamp derived from local noon on
  `performedOn`;
- UI and chronology code use `performedOn`, never the synthetic time; and
- `id` is generated once when the draft is created and remains stable across
  repeated save attempts.

For an existing live or legacy record, both new fields may be absent and
`completedAt` remains authoritative.

### Storage version

```ts
export type StoredAppStateV15 = AppState & {
  schemaVersion: 15;
};
```

The version-15 migration preserves version-14 state and validates optional
backfill metadata. If an otherwise valid record has malformed new optional
metadata, normalization drops only `performedOn` and `entryMode` and preserves
the record as legacy history. It must not synthesize `performedOn` for live or
legacy records. Backup export uses version 15; restore continues accepting all
currently supported older versions with their existing migration semantics.

## Date Boundary

User-entered strings and persisted JSON are untrusted boundary values. Internal
functions accept `CalendarDate` only after parsing.

```ts
export type CalendarDateError =
  | { code: "INVALID_DATE_FORMAT"; message: string }
  | { code: "INVALID_CALENDAR_DATE"; message: string }
  | { code: "FUTURE_DATE"; message: string };

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function parsePastCalendarDate(
  value: string,
  today?: Date,
): Result<CalendarDate, CalendarDateError>;

export function calendarDateForRecord(
  record: SessionRecord,
): CalendarDate | null;

export function compatibleCompletedAt(
  performedOn: CalendarDate,
): string;
```

Contract details:

- Parsing is strict: zero-padded `YYYY-MM-DD` only.
- Calendar validity is checked independently of JavaScript date rollover, so
  `2026-02-31` is rejected.
- The selected day may be today or any earlier day; future days are rejected.
- `calendarDateForRecord` prefers validated `performedOn`, falls back to the
  local calendar date of a valid `completedAt`, and returns `null` for an
  unusable legacy record.
- `compatibleCompletedAt` is serialization compatibility only. It must not be
  presented as a measured workout time.

## Chronology and Retention Boundary

All record ordering and insertion routes through `sessionJournal`. Consumers
must not call `.reverse()`, trust array position, or independently compare
`completedAt` values.

```ts
export type SessionRecordOrder = "newest-first" | "oldest-first";

export function sortSessionRecords(
  records: readonly SessionRecord[],
  order?: SessionRecordOrder,
): SessionRecord[];

export function insertSessionRecord(
  records: readonly SessionRecord[],
  record: ValidatedBackfillRecord,
): Result<SessionRecord[], SessionRecordInsertError>;

export type SessionRecordInsertError = {
  code: "RECORD_ID_CONFLICT";
  message: string;
  recordId: string;
};

export type ValidatedBackfillRecord = SessionRecord & {
  readonly __validatedBackfill: true;
  entryMode: "backfill";
  performedOn: CalendarDate;
  startedAt?: never;
  durationSeconds?: never;
};
```

Ordering is determined by:

1. valid resolved calendar date, with invalid legacy dates placed last;
2. real `completedAt` time when both records are live entries on the same day;
3. stable record identifier as the final deterministic tie-breaker.

`sortSessionRecords` always returns a new array and never mutates input.

`insertSessionRecord` is idempotent and accepts only the branded result of
backfill finalization:

- a new identifier inserts exactly once and returns a sorted copy;
- the same identifier with structurally identical record content succeeds and
  returns the existing sorted records unchanged; and
- the same identifier with different content fails with
  `RECORD_ID_CONFLICT` rather than silently overwriting or duplicating data.

The stable draft identifier is the idempotency key. Production IDs use a
`backfill:` namespace plus time and a collision-resistant suffix; the same ID
is reused if Save is retried. Equality is defined by a normalized field-by-
field record representation that ignores object property order and treats
absent optional fields consistently.

### Query contracts

Existing query names may be preserved where practical, but their behavior must
use the shared chronology helpers:

```ts
export function recordsInRecentCalendarWeeks(
  records: readonly SessionRecord[],
  weekCount: number,
  now?: Date,
): SessionRecord[];

export function groupRecordsByWeek(
  records: readonly SessionRecord[],
  now?: Date,
): Array<{
  key: string;
  label: string;
  records: SessionRecord[];
}>;
```

`compareSessionExercises`, `recordsInRange`, `exerciseProgress`, and
`personalRecords` must also resolve and sort performed dates internally. A
date-only backfill on today counts for the whole selected calendar day rather
than being excluded by its compatibility timestamp.

These are view/query functions only. App-state loading, saving, backup, and
record insertion never call a retention filter.

## Backfill Draft Contract

The draft deliberately does not reuse `ActiveSession`: it has no start time,
timer state, readiness check-in, rest state, or focused live exercise.

```ts
export type BackfillDraftId = string & {
  readonly __brand: "BackfillDraftId";
};

export type BackfillSourceReference =
  | {
      type: "planned";
      workoutId: string;
    }
  | {
      type: "history";
      recordId: string;
      sourceWorkoutId?: string;
    };

export type WorkoutBackfillDraft = {
  id: BackfillDraftId;
  performedOn: CalendarDate;
  source: BackfillSourceReference;
  workoutTitle: string;
  notes: string;
  exercises: Exercise[];
};

export type CreateWorkoutBackfillInput = {
  performedOn: CalendarDate;
  source:
    | { type: "planned"; workout: Workout }
    | { type: "history"; record: SessionRecord };
};

export function createWorkoutBackfillDraft(
  input: CreateWorkoutBackfillInput,
  id?: BackfillDraftId,
): WorkoutBackfillDraft;
```

The optional `id` exists for deterministic tests and controlled restoration.
Production callers omit it. Creation performs a deep copy of exercises and
sets and preserves order and prescription metadata. Planned sources mark each
valid prescribed set complete. Historical sources preserve each set's recorded
completion state. Invalid copied values are normalized to a safe editable
value and remain incomplete; they are never silently counted.

### Draft updates

```ts
export type BackfillSetPatch = Partial<
  Pick<SetLog, "weight" | "reps" | "completed">
>;

export type BackfillDraftUpdateError =
  | {
      code: "EXERCISE_NOT_FOUND";
      exerciseId: string;
      message: string;
    }
  | {
      code: "SET_NOT_FOUND";
      exerciseId: string;
      setIndex: number;
      message: string;
    };

export function updateBackfillSet(
  draft: WorkoutBackfillDraft,
  exerciseId: string,
  setIndex: number,
  patch: BackfillSetPatch,
): Result<WorkoutBackfillDraft, BackfillDraftUpdateError>;

export function updateBackfillNotes(
  draft: WorkoutBackfillDraft,
  notes: string,
): WorkoutBackfillDraft;

export function addBackfillSet(
  draft: WorkoutBackfillDraft,
  exerciseId: string,
): Result<WorkoutBackfillDraft, BackfillDraftUpdateError>;

export function removeBackfillSet(
  draft: WorkoutBackfillDraft,
  exerciseId: string,
  setIndex: number,
): Result<WorkoutBackfillDraft, BackfillDraftUpdateError>;
```

Unknown exercise or set references fail explicitly. No public draft operation
silently no-ops, mutates the supplied draft, or changes source identity/date.

### Finalization

```ts
export type BackfillValidationError =
  | CalendarDateError
  | {
      code: "NO_COMPLETED_SETS";
      message: string;
    }
  | {
      code: "INVALID_SET";
      exerciseId: string;
      setIndex: number;
      field: "weight" | "reps";
      message: string;
    };

export function finalizeWorkoutBackfill(
  draft: WorkoutBackfillDraft,
  today?: Date,
): Result<ValidatedBackfillRecord, BackfillValidationError>;
```

Finalization validates the entire draft at the user-input boundary. It returns
the same record identifier for every retry of the same draft, excludes
incomplete sets from volume, requires at least one valid completed set, and
rejects non-finite/negative weights or non-integer repetitions that fail the
existing exercise-specific validation even on incomplete sets. It omits
start/duration values and never accepts current workouts as an argument.
Planned drafts map their workout ID to `sourceWorkoutId`; historical drafts
preserve the original `sourceWorkoutId`. Both preserve the source title, start
with blank editable notes, and store weights in the app's existing canonical
units after UI display conversion.

## Save Boundary

The application owns persistence. The UI owns the draft. They communicate with
one synchronous result contract:

```ts
export type SaveBackfillError =
  | BackfillValidationError
  | SessionRecordInsertError
  | {
      code: "ACTIVE_SESSION_CONFLICT";
      message: string;
    };

export type SaveBackfillResult = Result<
  { recordId: string },
  SaveBackfillError
>;

export type SaveBackfill = (
  draft: WorkoutBackfillDraft,
)=> Promise<SaveBackfillResult>;
```

`App.tsx` implements this boundary in this order:

1. Reject when an `ActiveSession` exists.
2. Finalize the draft.
3. Insert idempotently with `insertSessionRecord` against the latest record ref.
4. Enqueue the complete next app state behind existing persistence writes and
   await `saveAppState`.
5. Replace record state only after the durable write succeeds.
6. Do not call `applySessionPerformance` or mutate workouts.

All app-state writes share one serialized promise queue so an earlier effect
cannot overwrite a newly saved backfill. Storage failure returns a typed
`STORAGE_WRITE_FAILED` error, keeps the draft open, and also updates the
existing app-level storage error surface. The flow reports success only after
the queued AsyncStorage write resolves.

## Component Interfaces

### History screen

```ts
export type HistoryScreenProps = {
  records: readonly SessionRecord[];
  workouts: readonly Workout[];
  activeSessionExists: boolean;
  isLoaded: boolean;
  storageError: string | null;
  weightUnit: WeightUnit;
  onSaveBackfill: SaveBackfill;
  onBackfillStateChange: (state: { active: boolean; dirty: boolean }) => void;
  onRequestScrollTop: () => void;
  onReturnToActiveWorkout: () => void;
  onUpdateNotes: (recordId: string, notes: string) => void;
  onUpdateExerciseName: (
    recordId: string,
    exerciseId: string,
    name: string,
  ) => void;
  onDelete: (recordId: string) => void;
  onRepeat: (record: SessionRecord, deload?: boolean) => void;
};
```

History provides read-only source collections and the save capability. It does
not receive state setters, storage functions, or `applySessionPerformance`.

### Backfill flow

```ts
export type MissedWorkoutFlowProps = {
  workouts: readonly Workout[];
  records: readonly SessionRecord[];
  weightUnit: WeightUnit;
  today?: Date;
  onSave: SaveBackfill;
  storageError: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onRequestScrollTop: () => void;
  onReturnToActiveWorkout: () => void;
  onCancel: () => void;
};

export type MissedWorkoutFlowState =
  | {
      step: "choose-source";
      performedOn: CalendarDate;
      sourceType: "planned" | "history";
      error?: CalendarDateError;
    }
  | {
      step: "edit";
      draft: WorkoutBackfillDraft;
      error?: BackfillDraftUpdateError | SaveBackfillError;
    }
  | {
      step: "saving";
      draft: WorkoutBackfillDraft;
    };
```

The discriminated state prevents rendering an editor without a valid source
or date. Save is disabled in `saving`, and retries reuse the same draft/id.

### Editor

```ts
export type MissedWorkoutEditorProps = {
  draft: WorkoutBackfillDraft;
  weightUnit: WeightUnit;
  error?: BackfillDraftUpdateError | SaveBackfillError;
  isSaving: boolean;
  onSetChange: (
    exerciseId: string,
    setIndex: number,
    patch: BackfillSetPatch,
  ) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setIndex: number) => void;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
  onCancel: () => void;
};
```

The editor is controlled and persistence-free. Narrow callbacks prevent it
from replacing draft identity, source, date, exercise order, or metadata. It
cannot alter workouts, history, or application storage. `error` covers both
field-update failures and final save failures through the same typed result
family.

## Error Semantics

All new fallible domain and save interfaces use `Result<T, E>`. They do not
mix exceptions, `null`, alerts, or silent no-ops. Error `code` is stable and
machine-readable; `message` is user-readable but is not used for branching.

Unexpected programmer errors may still throw during development, but malformed
dates, invalid sets, missing draft targets, duplicate save attempts, ID
conflicts, and active-session conflicts are expected outcomes represented by
the typed unions above.

The UI maps codes consistently:

| Code | Presentation |
|---|---|
| `INVALID_DATE_FORMAT`, `INVALID_CALENDAR_DATE`, `FUTURE_DATE` | Inline beside the date controls |
| `INVALID_SET` | Inline on the affected set row and summarized near Save |
| `NO_COMPLETED_SETS` | Save-summary error |
| `EXERCISE_NOT_FOUND`, `SET_NOT_FOUND` | Preserve draft and show a general editor error |
| `ACTIVE_SESSION_CONFLICT` | Blocking alert with a return to the live workout |
| `RECORD_ID_CONFLICT` | Preserve draft, block save, and report a storage-integrity error |

## Contract Tests

Implementation is not complete until tests prove:

- version-14 and older supported records migrate without loss;
- invalid optional persisted metadata is rejected at the storage boundary;
- date parsing rejects rollover and future values;
- sort/query results are independent of input order;
- same-day ordering is deterministic;
- inserting the same record twice is idempotent;
- reusing an identifier with different content fails loudly;
- planned and historical source objects remain deeply unchanged;
- draft update errors are explicit;
- finalization is deterministic for the same draft;
- invalid/incomplete sets do not inflate volume;
- no backfill interface accepts or returns mutable application state; and
- the save implementation never calls the current-load update path.

## Explicitly Unexposed Behavior

The contract intentionally does not expose:

- direct AsyncStorage access;
- a generic record-update or upsert API;
- mutation of existing history;
- current-routine performance updates;
- active-session conversion;
- fabricated duration or time;
- exercise add/remove/reorder operations;
- live rest or notification state; or
- a second version of the workout editor contract.

These omissions prevent later consumers from depending on behavior outside the
confirmed missed-workout scope.
