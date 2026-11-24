import { CalendarDate, Exercise, SessionRecord, sessionVolume, setValidationError, SetLog, Workout } from "./training";

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export type CalendarDateError =
  | { code: "INVALID_DATE_FORMAT"; message: string }
  | { code: "INVALID_CALENDAR_DATE"; message: string }
  | { code: "FUTURE_DATE"; message: string };
export type BackfillSourceReference =
  | { type: "planned"; workoutId: string }
  | { type: "history"; recordId: string; sourceWorkoutId?: string };
export type WorkoutBackfillDraft = { id: string; performedOn: CalendarDate; source: BackfillSourceReference; workoutTitle: string; notes: string; exercises: Exercise[] };
export type BackfillSetPatch = Partial<Pick<SetLog, "weight" | "reps" | "completed">>;
export type BackfillDraftUpdateError =
  | { code: "EXERCISE_NOT_FOUND"; exerciseId: string; message: string }
  | { code: "SET_NOT_FOUND"; exerciseId: string; setIndex: number; message: string }
  | { code: "LAST_SET_REQUIRED"; exerciseId: string; message: string };
export type BackfillValidationError = CalendarDateError
  | { code: "NO_COMPLETED_SETS"; message: string }
  | { code: "INVALID_SET"; exerciseId: string; setIndex: number; field: "weight" | "reps"; message: string };

declare const validatedBackfill: unique symbol;
export type ValidatedBackfillRecord = SessionRecord & {
  entryMode: "backfill";
  performedOn: CalendarDate;
  startedAt?: never;
  durationSeconds?: never;
  readonly [validatedBackfill]: true;
};
export type SessionRecordInsertError = { code: "RECORD_ID_CONFLICT"; message: string; recordId: string };
export type SaveBackfillError = BackfillValidationError | SessionRecordInsertError
  | { code: "ACTIVE_SESSION_CONFLICT"; message: string }
  | { code: "STORAGE_WRITE_FAILED"; message: string };
export type SaveBackfillResult = Result<{ recordId: string }, SaveBackfillError>;
export type SaveBackfill = (draft: WorkoutBackfillDraft) => Promise<SaveBackfillResult>;

export function parsePastCalendarDate(value: string, today = new Date()): Result<CalendarDate, CalendarDateError> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: { code: "INVALID_DATE_FORMAT", message: "Use a date in YYYY-MM-DD format." } };
  if (!isCalendarDate(value)) return { ok: false, error: { code: "INVALID_CALENDAR_DATE", message: "Enter a real calendar date." } };
  if (value > localCalendarDate(today)) return { ok: false, error: { code: "FUTURE_DATE", message: "Workout date cannot be in the future." } };
  return { ok: true, value: value as CalendarDate };
}

export function calendarDateForRecord(record: SessionRecord): CalendarDate | null {
  if (record.entryMode === "backfill" && record.performedOn && isCalendarDate(record.performedOn)) return record.performedOn as CalendarDate;
  const completedAt = new Date(record.completedAt);
  return Number.isNaN(completedAt.getTime()) ? null : localCalendarDate(completedAt) as CalendarDate;
}

export function compatibleCompletedAt(performedOn: CalendarDate): string {
  const [year, month, day] = performedOn.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

export function normalizeBackfillRecordMetadata(record: SessionRecord): SessionRecord {
  if (record.entryMode === "backfill" && record.performedOn && isCalendarDate(record.performedOn)) return record;
  const { entryMode: _entryMode, performedOn: _performedOn, ...legacy } = record;
  return legacy;
}

export function createWorkoutBackfillDraft(
  input: { performedOn: CalendarDate; source: { type: "planned"; workout: Workout } | { type: "history"; record: SessionRecord } },
  id = createBackfillId(input.performedOn),
): WorkoutBackfillDraft {
  const shouldCompleteAll = input.source.type === "planned";
  const sourceExercises: Exercise[] = input.source.type === "planned" ? input.source.workout.exercises : input.source.record.exercises;
  const source: BackfillSourceReference = input.source.type === "planned"
    ? { type: "planned", workoutId: input.source.workout.id }
    : { type: "history", recordId: input.source.record.id, sourceWorkoutId: input.source.record.sourceWorkoutId };
  const workoutTitle = input.source.type === "planned" ? input.source.workout.title : input.source.record.workoutTitle;
  return {
    id,
    performedOn: input.performedOn,
    source,
    workoutTitle,
    notes: "",
    exercises: sourceExercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set, index) => {
        const normalized = normalizeSet(set, exercise, index);
        return { ...normalized, completed: normalized.valid ? (shouldCompleteAll || set.completed) : false };
      }).map(({ valid: _valid, ...set }) => set),
    })),
  };
}

export function updateBackfillSet(draft: WorkoutBackfillDraft, exerciseId: string, setIndex: number, patch: BackfillSetPatch): Result<WorkoutBackfillDraft, BackfillDraftUpdateError> {
  const exerciseIndex = draft.exercises.findIndex((exercise) => exercise.id === exerciseId);
  if (exerciseIndex < 0) return { ok: false, error: { code: "EXERCISE_NOT_FOUND", exerciseId, message: "This exercise is no longer available." } };
  if (!draft.exercises[exerciseIndex].sets[setIndex]) return { ok: false, error: { code: "SET_NOT_FOUND", exerciseId, setIndex, message: "This set is no longer available." } };
  return { ok: true, value: {
    ...draft,
    exercises: draft.exercises.map((exercise, index) => index !== exerciseIndex ? exercise : {
      ...exercise,
      sets: exercise.sets.map((set, index) => index === setIndex ? { ...set, ...patch } : set),
    }),
  } };
}

export function updateBackfillNotes(draft: WorkoutBackfillDraft, notes: string): WorkoutBackfillDraft {
  return { ...draft, notes };
}

export function addBackfillSet(draft: WorkoutBackfillDraft, exerciseId: string): Result<WorkoutBackfillDraft, BackfillDraftUpdateError> {
  const exercise = draft.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return { ok: false, error: { code: "EXERCISE_NOT_FOUND", exerciseId, message: "This exercise is no longer available." } };
  const source = exercise.sets.at(-1) ?? { weight: exercise.lastWeight, reps: exercise.lastReps, completed: true };
  return { ok: true, value: {
    ...draft,
    exercises: draft.exercises.map((item) => item.id !== exerciseId ? item : { ...item, targetSets: item.sets.length + 1, sets: [...item.sets, { ...source, completed: true }] }),
  } };
}

export function removeBackfillSet(draft: WorkoutBackfillDraft, exerciseId: string, setIndex: number): Result<WorkoutBackfillDraft, BackfillDraftUpdateError> {
  const exercise = draft.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return { ok: false, error: { code: "EXERCISE_NOT_FOUND", exerciseId, message: "This exercise is no longer available." } };
  if (!exercise.sets[setIndex]) return { ok: false, error: { code: "SET_NOT_FOUND", exerciseId, setIndex, message: "This set is no longer available." } };
  if (exercise.sets.length === 1) return { ok: false, error: { code: "LAST_SET_REQUIRED", exerciseId, message: "Keep at least one set for each exercise." } };
  return { ok: true, value: {
    ...draft,
    exercises: draft.exercises.map((item) => item.id !== exerciseId ? item : { ...item, targetSets: item.sets.length - 1, sets: item.sets.filter((_, index) => index !== setIndex) }),
  } };
}

export function finalizeWorkoutBackfill(draft: WorkoutBackfillDraft, today = new Date()): Result<ValidatedBackfillRecord, BackfillValidationError> {
  const date = parsePastCalendarDate(draft.performedOn, today);
  if (!date.ok) return date;
  for (const exercise of draft.exercises) {
    for (let setIndex = 0; setIndex < exercise.sets.length; setIndex += 1) {
      const set = exercise.sets[setIndex];
      const error = setValidationError(set, exercise, setIndex);
      if (error) return { ok: false, error: { code: "INVALID_SET", exerciseId: exercise.id, setIndex, field: !Number.isFinite(set.weight) || set.weight < 0 ? "weight" : "reps", message: error } };
    }
  }
  if (!draft.exercises.some((exercise) => exercise.sets.some((set) => set.completed))) return { ok: false, error: { code: "NO_COMPLETED_SETS", message: "Mark at least one set complete to save this workout." } };
  const sourceWorkoutId = draft.source.type === "planned" ? draft.source.workoutId : draft.source.sourceWorkoutId;
  return { ok: true, value: {
    id: draft.id,
    sourceWorkoutId,
    completedAt: compatibleCompletedAt(date.value),
    performedOn: date.value,
    entryMode: "backfill",
    notes: draft.notes,
    workoutTitle: draft.workoutTitle,
    exercises: draft.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set })) })),
    volume: sessionVolume(draft.exercises),
  } as ValidatedBackfillRecord };
}

export function sortSessionRecords(records: readonly SessionRecord[], order: "newest-first" | "oldest-first" = "newest-first"): SessionRecord[] {
  return [...records].sort((left, right) => compareRecords(left, right, order));
}

export function insertSessionRecord(records: readonly SessionRecord[], record: ValidatedBackfillRecord): Result<SessionRecord[], SessionRecordInsertError> {
  const existing = records.find((item) => item.id === record.id);
  if (existing) {
    if (stableSerialize(existing) === stableSerialize(record)) return { ok: true, value: sortSessionRecords(records) };
    return { ok: false, error: { code: "RECORD_ID_CONFLICT", recordId: record.id, message: "A different workout already uses this record identifier." } };
  }
  return { ok: true, value: sortSessionRecords([...records, record]) };
}

function normalizeSet(set: SetLog, exercise: Exercise, setIndex: number): SetLog & { valid: boolean } {
  const weight = Number.isFinite(set.weight) && set.weight >= 0 ? set.weight : 0;
  const minimumReps = Math.min(6, exercise.repRange[0]);
  const reps = set.reps !== null && Number.isInteger(set.reps) && set.reps >= minimumReps ? set.reps : minimumReps;
  const normalized = { weight, reps, completed: set.completed };
  return { ...normalized, valid: !setValidationError(normalized, exercise, setIndex) };
}

function compareRecords(left: SessionRecord, right: SessionRecord, order: "newest-first" | "oldest-first"): number {
  const leftDate = calendarDateForRecord(left);
  const rightDate = calendarDateForRecord(right);
  if (!leftDate && !rightDate) return left.id.localeCompare(right.id);
  if (!leftDate) return 1;
  if (!rightDate) return -1;
  const direction = order === "newest-first" ? -1 : 1;
  const dateComparison = leftDate.localeCompare(rightDate);
  if (dateComparison) return dateComparison * direction;
  if (left.entryMode !== "backfill" && right.entryMode !== "backfill") {
    const timeComparison = new Date(left.completedAt).getTime() - new Date(right.completedAt).getTime();
    if (timeComparison) return timeComparison * direction;
  }
  return left.id.localeCompare(right.id) * direction;
}

function localCalendarDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(year, month - 1, day);
  return candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day;
}

function createBackfillId(performedOn: CalendarDate): string {
  return `backfill:${performedOn}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
