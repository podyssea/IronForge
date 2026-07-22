import { describe, expect, it } from "vitest";
import { CoachingProfile, DEFAULT_COACHING_PROFILE } from "./coaching";
import { getExerciseDefinition, MuscleGroup } from "./exerciseLibrary";
import { generateAdaptiveProgram } from "./programGenerator";
import { initialFourDaySplit } from "./training";

describe("adaptive program generator", () => {
  it.each([2, 3, 4, 5])("generates a complete %i-day split", (days) => {
    const workouts = generateAdaptiveProgram(days, DEFAULT_COACHING_PROFILE, []);
    expect(workouts).toHaveLength(days);
    expect(new Set(workouts.map((workout) => workout.id)).size).toBe(days);
    expect(workouts.every((workout) => workout.exercises.length >= 4)).toBe(true);
  });

  it("uses only selected equipment and respects experience", () => {
    const profile: CoachingProfile = { ...DEFAULT_COACHING_PROFILE, experience: "beginner", availableEquipment: ["bodyweight"] };
    const workouts = generateAdaptiveProgram(3, profile, []);
    const definitions = workouts.flatMap((workout) => workout.exercises).map((exercise) => getExerciseDefinition(exercise.id)!);
    expect(definitions.every((exercise) => exercise.equipment.includes("bodyweight"))).toBe(true);
    expect(definitions.every((exercise) => exercise.difficulty === "beginner")).toBe(true);
  });

  it("prioritizes preferred exercises and avoids exclusions", () => {
    const profile: CoachingProfile = { ...DEFAULT_COACHING_PROFILE, experience: "advanced", preferredExerciseIds: ["back-squat"], excludedExerciseIds: ["barbell-bench", "lat-pulldown"] };
    const workouts = generateAdaptiveProgram(2, profile, []);
    const ids = workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.id));
    expect(ids).toContain("back-squat");
    expect(ids).not.toContain("barbell-bench");
    expect(ids).not.toContain("lat-pulldown");
  });

  it("uses goal-specific prescriptions", () => {
    const strength = generateAdaptiveProgram(2, { ...DEFAULT_COACHING_PROFILE, goal: "strength" }, []);
    const endurance = generateAdaptiveProgram(2, { ...DEFAULT_COACHING_PROFILE, goal: "muscular-endurance" }, []);
    expect(strength[0].exercises[0].repRange[1]).toBeLessThan(endurance[0].exercises[0].repRange[0]);
    expect(strength[0].exercises[0].targetSets).toBeGreaterThan(endurance[0].exercises[0].targetSets);
  });

  it("scales exercise count with requested session length", () => {
    const short = generateAdaptiveProgram(4, { ...DEFAULT_COACHING_PROFILE, sessionMinutes: 30 }, []);
    const long = generateAdaptiveProgram(4, { ...DEFAULT_COACHING_PROFILE, sessionMinutes: 90 }, []);
    expect(short.every((workout) => workout.exercises.length === 4)).toBe(true);
    expect(long.every((workout) => workout.exercises.length > 4)).toBe(true);
  });

  it("avoids duplicate exercises within a workout and explains selections", () => {
    const workouts = generateAdaptiveProgram(5, DEFAULT_COACHING_PROFILE, []);
    workouts.forEach((workout) => {
      expect(new Set(workout.exercises.map((exercise) => exercise.id)).size).toBe(workout.exercises.length);
      expect(workout.exercises.every((exercise) => Boolean(exercise.selectionReason))).toBe(true);
    });
  });

  it("covers major upper and lower muscle groups across the week", () => {
    const workouts = generateAdaptiveProgram(4, DEFAULT_COACHING_PROFILE, []);
    const muscles = new Set(workouts.flatMap((workout) => workout.exercises.flatMap((exercise) => getExerciseDefinition(exercise.id)?.primaryMuscles ?? [])));
    (["chest", "upper-back", "lats", "quadriceps", "hamstrings", "glutes"] as MuscleGroup[]).forEach((muscle) => expect(muscles.has(muscle)).toBe(true));
  });

  it("retains known performance for selected exercises", () => {
    const existing = initialFourDaySplit();
    existing.flatMap((workout) => workout.exercises).forEach((exercise) => { if (exercise.id === "incline-smith") exercise.lastWeight = 52.5; });
    const workouts = generateAdaptiveProgram(4, { ...DEFAULT_COACHING_PROFILE, preferredExerciseIds: ["incline-smith"] }, existing);
    const retained = workouts.flatMap((workout) => workout.exercises).find((exercise) => exercise.id === "incline-smith");
    expect(retained?.lastWeight).toBe(52.5);
  });
});
