import { describe, expect, it } from "vitest";
import { compareSessionExercises, deleteSessionRecord, exerciseVolume, formatDuration } from "./sessionJournal";
import { completeActiveSession, initialFourDaySplit, startActiveSession } from "./training";

function completedRecord(weight: number, reps: number, start: string, finish: string, notes = "") {
  const session = startActiveSession(initialFourDaySplit()[0], new Date(start));
  session.notes = notes;
  session.exercises[0].sets[0] = { weight, reps, completed: true };
  return completeActiveSession(session, new Date(finish));
}

describe("workout journal", () => {
  it("captures duration, source workout, and notes on completion", () => {
    const record = completedRecord(40, 8, "2026-01-01T10:00:00.000Z", "2026-01-01T11:05:30.000Z", "Strong session");
    expect(record.sourceWorkoutId).toBe("upper-a");
    expect(record.durationSeconds).toBe(3930);
    expect(record.notes).toBe("Strong session");
    expect(formatDuration(record.durationSeconds)).toBe("65m 30s");
  });

  it("reports completed exercise volume and ignores skipped sets", () => {
    const record = completedRecord(40, 8, "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z");
    record.exercises[0].sets[1] = { weight: 100, reps: 10, completed: false };
    expect(exerciseVolume(record.exercises[0])).toBe(320);
  });

  it("compares performance with the preceding matching session", () => {
    const older = completedRecord(40, 8, "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z");
    const newer = completedRecord(42.5, 9, "2026-01-08T10:00:00.000Z", "2026-01-08T11:00:00.000Z");
    const comparison = compareSessionExercises(newer, [newer, older]).get("incline-smith");
    expect(comparison).toMatchObject({ previousFound: true, weightChange: 2.5, repChange: 1, volumeChange: 62.5 });
  });

  it("marks the first recorded exercise performance", () => {
    const record = completedRecord(40, 8, "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z");
    expect(compareSessionExercises(record, [record]).get("incline-smith")?.previousFound).toBe(false);
  });

  it("deletes only the requested journal entry", () => {
    const first = completedRecord(40, 8, "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z");
    const second = completedRecord(42.5, 8, "2026-01-08T10:00:00.000Z", "2026-01-08T11:00:00.000Z");
    expect(deleteSessionRecord([second, first], first.id)).toEqual([second]);
  });

  it("formats unavailable legacy duration", () => {
    expect(formatDuration()).toBe("Duration unavailable");
  });
});
