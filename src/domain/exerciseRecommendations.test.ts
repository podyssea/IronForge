import { describe, expect, it } from "vitest";
import { rankExerciseCandidates } from "./exerciseRecommendations";

describe("exercise replacement recommendations", () => {
  it("ranks explicit substitutions before compatible exercises and fallback", () => {
    const candidates = rankExerciseCandidates({
      currentExerciseId: "barbell-bench",
      availableEquipment: ["barbell", "dumbbell", "machine", "bodyweight"],
    });

    expect(candidates.slice(0, 2).map((candidate) => candidate.exercise.id)).toEqual(["dumbbell-bench", "machine-chest"]);
    expect(candidates.slice(0, 2).every((candidate) => candidate.match === "substitution")).toBe(true);
    expect(candidates.findIndex((candidate) => candidate.match === "compatible")).toBeGreaterThan(1);
    expect(candidates.findIndex((candidate) => candidate.match === "other")).toBeGreaterThan(candidates.findLastIndex((candidate) => candidate.match === "compatible"));
  });

  it("boosts preferred exercises within their match tier deterministically", () => {
    const candidates = rankExerciseCandidates({
      currentExerciseId: "barbell-bench",
      availableEquipment: ["dumbbell", "machine"],
      preferredExerciseIds: ["machine-chest"],
    });

    expect(candidates[0]).toMatchObject({ match: "substitution", preferred: true, exercise: { id: "machine-chest" } });
    expect(candidates[1]).toMatchObject({ match: "substitution", preferred: false, exercise: { id: "dumbbell-bench" } });
  });

  it("excludes the current, programmed, unavailable, and explicitly excluded exercises", () => {
    const candidates = rankExerciseCandidates({
      currentExerciseId: "barbell-bench",
      workoutExerciseIds: ["barbell-bench", "dumbbell-bench"],
      availableEquipment: ["machine"],
      excludedExerciseIds: ["machine-chest"],
    });
    const ids = candidates.map((candidate) => candidate.exercise.id);

    expect(ids).not.toContain("barbell-bench");
    expect(ids).not.toContain("dumbbell-bench");
    expect(ids).not.toContain("machine-chest");
    expect(candidates.every((candidate) => candidate.exercise.equipment.includes("machine"))).toBe(true);
  });

  it.each([
    ["bench press", "dumbbell-bench"],
    ["chest", "dumbbell-bench"],
    ["dumbbell", "dumbbell-bench"],
    ["horizontal push", "dumbbell-bench"],
    ["front delts", "dumbbell-bench"],
  ])("searches %s metadata", (query, expectedId) => {
    const candidates = rankExerciseCandidates({ search: query });

    expect(candidates.map((candidate) => candidate.exercise.id)).toContain(expectedId);
  });

  it("uses exercise name and identifier as deterministic fallback tie-breakers", () => {
    const candidates = rankExerciseCandidates({ availableEquipment: ["kettlebell"] });
    const names = candidates.map((candidate) => candidate.exercise.name);

    expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right)));
    expect(new Set(candidates.map((candidate) => candidate.exercise.id)).size).toBe(candidates.length);
  });
});
