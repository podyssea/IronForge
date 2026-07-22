import { describe, expect, it } from "vitest";
import { calculateAnalytics, exerciseProgress, personalRecords, recordsInRange } from "./analytics";
import { personalBaselineRecords } from "./personalBaseline";

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
    expect(analytics.consistencyPercent).toBe(50);
  });

  it("builds chronological exercise progress points", () => {
    const progress = exerciseProgress(personalBaselineRecords(), "incline-smith", "all", now);
    expect(progress).toEqual([{ recordId: "imported-2026-07-20-upper-a", completedAt: "2026-07-20T18:00:00.000Z", weight: 90, reps: 8, volume: 2880 }]);
  });

  it("finds personal records from completed sets", () => {
    const records = personalRecords(personalBaselineRecords());
    expect(records.find((record) => record.exerciseId === "leg-press")).toMatchObject({ maxWeight: 145, maxReps: 12, bestSetVolume: 1740 });
  });
});
