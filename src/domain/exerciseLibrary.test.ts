import { describe, expect, it } from "vitest";
import { EXERCISE_LIBRARY, filterExerciseLibrary, getExerciseDefinition, getExerciseSubstitutions } from "./exerciseLibrary";
import { initialFourDaySplit } from "./training";

describe("exercise library", () => {
  it("contains a broad catalog with unique IDs", () => {
    expect(EXERCISE_LIBRARY.length).toBeGreaterThanOrEqual(99);
    expect(new Set(EXERCISE_LIBRARY.map((exercise) => exercise.id)).size).toBe(EXERCISE_LIBRARY.length);
  });

  it("includes advanced Classic Physique metadata and exercise options", () => {
    const pendulum = getExerciseDefinition("pendulum-squat");
    expect(pendulum).toMatchObject({ resistanceProfile: "lengthened", trainingRole: "stable-compound", classicPhysiquePriority: 5 });
    expect(getExerciseDefinition("bayesian-curl")?.intensityTechniques).toContain("drop-set");
    expect(getExerciseDefinition("machine-high-row")?.primaryMuscles).toContain("upper-back");
  });

  it("contains every exercise used by the current program", () => {
    const programIds = new Set(initialFourDaySplit().flatMap((workout) => workout.exercises.map((exercise) => exercise.id)));
    expect(Array.from(programIds).filter((id) => !getExerciseDefinition(id))).toEqual([]);
  });

  it("only references valid substitutions", () => {
    const missing = EXERCISE_LIBRARY.flatMap((exercise) => exercise.substitutions.filter((id) => !getExerciseDefinition(id)).map((id) => `${exercise.id}:${id}`));
    expect(missing).toEqual([]);
  });

  it("filters by equipment, muscle, style, and difficulty", () => {
    const results = filterExerciseLibrary({ equipment: ["dumbbell"], muscle: "chest", style: "hypertrophy", maximumDifficulty: "beginner" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((exercise) => exercise.equipment.includes("dumbbell") && exercise.primaryMuscles.includes("chest") && exercise.difficulty === "beginner")).toBe(true);
  });

  it("returns substitutions compatible with available equipment", () => {
    const substitutions = getExerciseSubstitutions("barbell-bench", ["dumbbell"]);
    expect(substitutions.map((exercise) => exercise.id)).toContain("dumbbell-bench");
    expect(substitutions.every((exercise) => exercise.equipment.includes("dumbbell"))).toBe(true);
  });
});
