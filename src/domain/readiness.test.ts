import { describe, expect, it } from "vitest";
import { evaluateReadiness, initialFourDaySplit, loadIncrement, startRecoveryAwareSession } from "./training";

describe("readiness-aware workouts", () => {
  it("keeps the planned workout when readiness is high", () => {
    const workout = initialFourDaySplit()[0];
    const session = startRecoveryAwareSession(workout, { energy: 5, sleep: 5, soreness: 1 });
    expect(session.readiness).toMatchObject({ score: 100, level: "ready" });
    expect(session.exercises[0].targetSets).toBe(workout.exercises[0].targetSets);
    expect(session.exercises[0].sets.map((set) => set.weight)).toEqual([17.5, 24.5, 35, 35]);
  });

  it("reduces load and one set when recovery is low", () => {
    const workout = initialFourDaySplit()[0];
    workout.exercises[0].loadingType = "plate-loaded";
    const session = startRecoveryAwareSession(workout, { energy: 1, sleep: 1, soreness: 5 });
    expect(session.readiness?.level).toBe("low");
    expect(session.exercises[0].targetSets).toBe(3);
    expect(session.exercises[0].sets.map((set) => set.weight)).toEqual([20, 30, 30]);
  });

  it("rejects values outside the five-point scale", () => {
    expect(() => evaluateReadiness({ energy: 0, sleep: 5, soreness: 1 })).toThrow();
  });

  it("uses loading-specific progression increments", () => {
    const exercise = initialFourDaySplit()[0].exercises[0];
    expect(loadIncrement({ ...exercise, loadingType: "pin-loaded" })).toBe(5);
    expect(loadIncrement({ ...exercise, loadingType: "plate-loaded" })).toBe(2.5);
  });
});
