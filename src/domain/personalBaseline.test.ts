import { describe, expect, it } from "vitest";
import { personalBaselineRecords, personalBaselineWorkouts, strengthFocusedFourDaySplit } from "./personalBaseline";
import { normalizeExercisePrescription, updateExercisePrescription } from "./training";

describe("personal training baseline", () => {
  it("builds the requested four-day upper/lower split", () => {
    const workouts = personalBaselineWorkouts();
    expect(workouts.map((workout) => workout.id)).toEqual(["upper-a", "lower-a", "upper-b", "lower-b"]);
    expect(workouts.flatMap((workout) => workout.exercises)).toHaveLength(27);
    expect(workouts[0].exercises[0]).toMatchObject({ name: "Incline Smith Press", lastWeight: 90, lastReps: 8, targetSets: 4 });
  });

  it("imports every prescribed set at its upper rep target", () => {
    const records = personalBaselineRecords();
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.sourceWorkoutId)).toEqual(["lower-a", "upper-a"]);
    expect(records.every((record) => record.exercises.every((exercise) => exercise.sets.length === exercise.targetSets && exercise.sets.every((set) => set.completed && set.reps === exercise.repRange[1])))).toBe(true);
  });

  it("preserves explicitly entered per-arm loads as displayed values", () => {
    const workouts = personalBaselineWorkouts();
    expect(workouts[0].exercises.find((exercise) => exercise.id === "lateral-raise")?.lastWeight).toBe(5);
    expect(workouts[2].exercises.find((exercise) => exercise.id === "single-arm-row")?.lastWeight).toBe(10);
  });

  it("calculates imported volume from valid completed sets", () => {
    const upperA = personalBaselineRecords().find((record) => record.sourceWorkoutId === "upper-a");
    expect(upperA?.volume).toBe(11405);
  });

  it("builds the prescribed strength split and carries forward matching exercise loads", () => {
    const existing = personalBaselineWorkouts();
    const workouts = strengthFocusedFourDaySplit(existing, personalBaselineRecords());

    expect(workouts.map((workout) => workout.exercises.length)).toEqual([7, 6, 7, 6]);
    expect(workouts[0].exercises[0]).toMatchObject({ name: "Barbell Bench Press", targetSets: 4, repRange: [3, 5], rirRange: [1, 2], restSeconds: 180 });
    expect(workouts[0].exercises.find((exercise) => exercise.id === "tbar-row")?.lastWeight).toBe(60);
    expect(workouts[1].exercises.find((exercise) => exercise.id === "hack-squat")?.lastWeight).toBe(120);
    expect(workouts[3].exercises.find((exercise) => exercise.id === "rdl")?.lastWeight).toBe(100);
    expect(workouts[2].exercises.find((exercise) => exercise.id === "overhead-press")?.lastWeight).toBe(0);
    expect(workouts.every((workout) => workout.exercises.every((exercise) => exercise.sets.length === exercise.targetSets && exercise.programmedWorkingSets))).toBe(true);
    expect(normalizeExercisePrescription(workouts[0].exercises[0]).repRange).toEqual([3, 5]);
    expect(updateExercisePrescription(workouts[0].exercises[0], { targetSets: 5 }).repRange).toEqual([3, 5]);
  });
});
