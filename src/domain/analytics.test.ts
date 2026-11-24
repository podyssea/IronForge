import { describe, expect, it } from "vitest";
import { calculateAnalytics, exerciseProgress, personalRecords, recordsInRange } from "./analytics";
import { personalBaselineRecords } from "./personalBaseline";
import { completeActiveSession, initialFourDaySplit, startActiveSession } from "./training";
import { createWorkoutBackfillDraft, finalizeWorkoutBackfill, parsePastCalendarDate } from "./workoutBackfill";

const now = new Date("2026-07-22T12:00:00.000Z");

describe("training analytics", () => {
  it("filters records into a selected time range without including future sessions", () => {
    const records = personalBaselineRecords();
    expect(recordsInRange(records, 7, now)).toHaveLength(2);
    expect(recordsInRange(records, 7, new Date("2026-07-20T20:00:00.000Z"))).toHaveLength(1);
  });

  it("calculates session, set, volume, and consistency totals", () => {
    const analytics = calculateAnalytics(personalBaselineRecords(), 7, 4, now);
    expect(analytics.sessions).toBe(2);
    expect(analytics.sets).toBe(46);
    expect(analytics.volume).toBe(31525);
    expect(analytics.workingSets).toBe(26);
    expect(analytics.warmupSets).toBe(20);
    expect(analytics.volume).not.toBeNull();
    expect(analytics.workingVolume).toBeLessThan(analytics.volume ?? 0);
    expect(analytics.consistencyPercent).toBe(50);
  });

  it("marks summary working volume unavailable while counting every summary row as working", () => {
    const exercise = initialFourDaySplit()[0].exercises[0];
    const record = {
      id: "summary",
      completedAt: "2026-07-22T10:00:00.000Z",
      workoutTitle: "Upper",
      exerciseLogFormat: "exercise-summary-v1" as const,
      exercises: [{ ...exercise, sets: Array.from({ length: 3 }, () => ({ weight: 80, reps: null, completed: true })) }],
      volume: null,
    };

    expect(calculateAnalytics([record], "all", 4, now)).toMatchObject({ sets: 3, workingSets: 3, warmupSets: 0, volume: null, workingVolume: null, warmupVolume: 0 });
  });

  it("builds chronological exercise progress points", () => {
    const progress = exerciseProgress(personalBaselineRecords(), "incline-smith", "all", now);
    expect(progress).toEqual([{ recordId: "imported-2026-07-20-upper-a", completedAt: "2026-07-20T18:00:00.000Z", weight: 90, reps: 8, volume: 1440 }]);
  });

  it("builds chronological progress from shuffled input", () => {
    const records = personalBaselineRecords();
    expect(exerciseProgress([...records].reverse(), "incline-smith", "all", now)).toEqual(exerciseProgress(records, "incline-smith", "all", now));
  });

  it("includes a date-only backfill made today even before its compatibility timestamp", () => {
    const parsed = parsePastCalendarDate("2026-07-22", now);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const draft = createWorkoutBackfillDraft({ performedOn: parsed.value, source: { type: "planned", workout: initialFourDaySplit()[0] } }, "backfill:today");
    const finalized = finalizeWorkoutBackfill(draft, now);
    expect(finalized.ok).toBe(true);
    if (!finalized.ok) return;
    expect(recordsInRange([finalized.value], 7, new Date("2026-07-22T08:00:00.000Z"))).toHaveLength(1);
  });

  it("does not also count the current range boundary date in the prior period", () => {
    const periodEnd = new Date("2026-07-22T12:00:00.000Z");
    const parsed = parsePastCalendarDate("2026-07-15", periodEnd);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const draft = createWorkoutBackfillDraft({ performedOn: parsed.value, source: { type: "planned", workout: initialFourDaySplit()[0] } }, "backfill:boundary");
    const finalized = finalizeWorkoutBackfill(draft, periodEnd);
    expect(finalized.ok).toBe(true);
    if (!finalized.ok) return;

    expect(calculateAnalytics([finalized.value], 7, 4, periodEnd).volumeChangePercent).toBeUndefined();
  });

  it("finds personal records from completed sets", () => {
    const records = personalRecords(personalBaselineRecords());
    expect(records.find((record) => record.exerciseId === "leg-press")).toMatchObject({ maxWeight: 145, maxReps: 12, bestSetVolume: 1740 });
  });

  it("attributes personal records chronologically from shuffled input", () => {
    const workout = initialFourDaySplit()[0];
    const olderSession = startActiveSession(workout, new Date("2026-01-01T10:00:00.000Z"));
    olderSession.exercises[0].sets[0] = { weight: 40, reps: 8, completed: true };
    const newerSession = startActiveSession(workout, new Date("2026-01-08T10:00:00.000Z"));
    newerSession.exercises[0].sets[0] = { weight: 50, reps: 8, completed: true };
    const older = completeActiveSession(olderSession, new Date("2026-01-01T11:00:00.000Z"));
    const newer = completeActiveSession(newerSession, new Date("2026-01-08T11:00:00.000Z"));
    expect(personalRecords([older, newer])).toEqual(personalRecords([newer, older]));
  });
});
