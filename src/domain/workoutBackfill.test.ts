import { describe, expect, it } from "vitest";
import { completeActiveSession, initialFourDaySplit, startActiveSession } from "./training";
import {
  addBackfillSet,
  calendarDateForRecord,
  compatibleCompletedAt,
  createWorkoutBackfillDraft,
  finalizeWorkoutBackfill,
  insertSessionRecord,
  parsePastCalendarDate,
  removeBackfillSet,
  sortSessionRecords,
  updateBackfillSet,
} from "./workoutBackfill";

const today = new Date(2026, 10, 24, 18, 0, 0);

function calendarDate(value: string) {
  const parsed = parsePastCalendarDate(value, today);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.value;
}

function completedHistoryRecord() {
  const session = startActiveSession(initialFourDaySplit()[0], new Date(2026, 10, 20, 10));
  session.exercises[0].sets[0] = { weight: 37.5, reps: 8, completed: true };
  session.exercises[0].sets[1] = { weight: 40, reps: 8, completed: false };
  return completeActiveSession(session, new Date(2026, 10, 20, 11));
}

describe("missed workout backfill", () => {
  it("parses real non-future calendar dates without JavaScript rollover", () => {
    expect(parsePastCalendarDate("2026-02-29", today)).toMatchObject({ ok: false, error: { code: "INVALID_CALENDAR_DATE" } });
    expect(parsePastCalendarDate("24-11-2026", today)).toMatchObject({ ok: false, error: { code: "INVALID_DATE_FORMAT" } });
    expect(parsePastCalendarDate("2026-11-25", today)).toMatchObject({ ok: false, error: { code: "FUTURE_DATE" } });
    expect(parsePastCalendarDate("2026-11-24", today)).toEqual({ ok: true, value: "2026-11-24" });
  });

  it("preserves a date-only value independently from its compatibility timestamp", () => {
    const performedOn = calendarDate("2026-11-23");
    const completedAt = compatibleCompletedAt(performedOn);
    expect(calendarDateForRecord({ ...completedHistoryRecord(), entryMode: "backfill", performedOn, completedAt })).toBe("2026-11-23");
  });

  it("pre-completes a planned workout without mutating it", () => {
    const workout = initialFourDaySplit()[0];
    const before = structuredClone(workout);
    const draft = createWorkoutBackfillDraft({ performedOn: calendarDate("2026-11-23"), source: { type: "planned", workout } }, "backfill:test-planned");

    expect(draft.exercises.every((exercise) => exercise.sets.every((set) => set.completed))).toBe(true);
    expect(workout).toEqual(before);
  });

  it("preserves skipped-set state when cloning history", () => {
    const record = completedHistoryRecord();
    const before = structuredClone(record);
    const draft = createWorkoutBackfillDraft({ performedOn: calendarDate("2026-11-21"), source: { type: "history", record } }, "backfill:test-history");

    expect(draft.exercises[0].sets[0].completed).toBe(true);
    expect(draft.exercises[0].sets[1].completed).toBe(false);
    expect(record).toEqual(before);
  });

  it("updates, adds, and removes sets immutably", () => {
    const workout = initialFourDaySplit()[0];
    const draft = createWorkoutBackfillDraft({ performedOn: calendarDate("2026-11-23"), source: { type: "planned", workout } }, "backfill:test-edit");
    const updated = updateBackfillSet(draft, draft.exercises[0].id, 0, { weight: 42.5, reps: 7 });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    const added = addBackfillSet(updated.value, draft.exercises[0].id);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const removed = removeBackfillSet(added.value, draft.exercises[0].id, added.value.exercises[0].sets.length - 1);
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;

    expect(updated.value.exercises[0].sets[0]).toMatchObject({ weight: 42.5, reps: 7 });
    expect(removed.value.exercises[0].sets).toHaveLength(draft.exercises[0].sets.length);
    expect(draft.exercises[0].sets[0]).not.toEqual(updated.value.exercises[0].sets[0]);
  });

  it("rejects unknown update targets explicitly", () => {
    const workout = initialFourDaySplit()[0];
    const draft = createWorkoutBackfillDraft({ performedOn: calendarDate("2026-11-23"), source: { type: "planned", workout } }, "backfill:test-unknown");
    expect(updateBackfillSet(draft, "missing", 0, { reps: 8 })).toMatchObject({ ok: false, error: { code: "EXERCISE_NOT_FOUND" } });
    expect(updateBackfillSet(draft, draft.exercises[0].id, 999, { reps: 8 })).toMatchObject({ ok: false, error: { code: "SET_NOT_FOUND" } });
  });

  it("finalizes a validated record without measured time or current-load mutation", () => {
    const workout = initialFourDaySplit()[0];
    const before = structuredClone(workout);
    const draft = createWorkoutBackfillDraft({ performedOn: calendarDate("2026-11-23"), source: { type: "planned", workout } }, "backfill:test-finalize");
    const result = finalizeWorkoutBackfill(draft, today);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ id: "backfill:test-finalize", entryMode: "backfill", performedOn: "2026-11-23", sourceWorkoutId: workout.id, workoutTitle: workout.title });
    expect(result.value).not.toHaveProperty("startedAt");
    expect(result.value).not.toHaveProperty("durationSeconds");
    expect(result.value.volume).toBeGreaterThan(0);
    expect(workout).toEqual(before);
  });

  it("rejects invalid numeric values even when a set is incomplete", () => {
    const workout = initialFourDaySplit()[0];
    const draft = createWorkoutBackfillDraft({ performedOn: calendarDate("2026-11-23"), source: { type: "planned", workout } }, "backfill:test-invalid");
    const updated = updateBackfillSet(draft, draft.exercises[0].id, 0, { weight: Number.NaN, completed: false });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(finalizeWorkoutBackfill(updated.value, today)).toMatchObject({ ok: false, error: { code: "INVALID_SET", field: "weight" } });
  });

  it("inserts retries idempotently and rejects identifier reuse with different content", () => {
    const workout = initialFourDaySplit()[0];
    const draft = createWorkoutBackfillDraft({ performedOn: calendarDate("2026-11-23"), source: { type: "planned", workout } }, "backfill:test-retry");
    const finalized = finalizeWorkoutBackfill(draft, today);
    expect(finalized.ok).toBe(true);
    if (!finalized.ok) return;

    const first = insertSessionRecord([], finalized.value);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const retry = insertSessionRecord(first.value, finalized.value);
    expect(retry).toEqual({ ok: true, value: first.value });
    const conflicting = { ...finalized.value, notes: "different" };
    expect(insertSessionRecord(first.value, conflicting)).toMatchObject({ ok: false, error: { code: "RECORD_ID_CONFLICT" } });
  });

  it("sorts by performed date regardless of input order and places invalid legacy dates last", () => {
    const older = { ...completedHistoryRecord(), id: "older", completedAt: "2026-11-01T11:00:00.000Z" };
    const newer = { ...completedHistoryRecord(), id: "newer", completedAt: "2026-11-20T11:00:00.000Z" };
    const invalid = { ...completedHistoryRecord(), id: "invalid", completedAt: "not-a-date" };
    expect(sortSessionRecords([older, invalid, newer]).map((record) => record.id)).toEqual(["newer", "older", "invalid"]);
  });
});
