import { describe, expect, it } from "vitest";
import { applySessionPerformance, applyTrainingPhase, completeActiveSession, exercisesMissingLoadingType, generateFromStyle, initialFourDaySplit, isSessionComplete, progression, replaceWorkoutExercise, sessionVolume, setValidationError, startActiveSession } from "./training";
import { getExerciseDefinition } from "./exerciseLibrary";

describe("program generation", () => {
  it.each([2, 3, 4, 5])("builds a %i-day program", (days) => {
    const workouts = generateFromStyle(days, []);
    expect(workouts).toHaveLength(days);
    expect(new Set(workouts.map((workout) => workout.id)).size).toBe(days);
  });

  it("retains known loads when changing splits", () => {
    const existing = initialFourDaySplit();
    existing[0].exercises[0].lastWeight = 47.5;
    const generated = generateFromStyle(2, existing);
    const retained = generated.flatMap((workout) => workout.exercises).find((exercise) => exercise.id === "incline-smith");
    expect(retained?.lastWeight).toBe(47.5);
    expect(retained?.sets.every((set) => set.weight === 47.5)).toBe(true);
  });
});

describe("training phases", () => {
  it("reduces reps and focused set counts for strength", () => {
    const source = initialFourDaySplit();
    const strength = applyTrainingPhase(source, "strength");
    expect(strength[0].exercises[0].targetSets).toBe(3);
    expect(strength[0].exercises[0].repRange).toEqual([3, 5]);
    expect(strength[0].exercises[0].sets).toHaveLength(3);
  });

  it("halves set volume and reduces weight for deload", () => {
    const source = initialFourDaySplit();
    const deload = applyTrainingPhase(source, "deload");
    expect(deload[0].exercises[0].targetSets).toBe(2);
    expect(deload[0].exercises[0].sets[0].weight).toBe(30);
    expect(deload[0].exercises[0].sets.every((set) => !set.completed)).toBe(true);
  });

  it("leaves exercise prescriptions intact for hypertrophy", () => {
    const source = initialFourDaySplit();
    const hypertrophy = applyTrainingPhase(source, "hypertrophy");
    expect(hypertrophy[0].exercises[0].targetSets).toBe(source[0].exercises[0].targetSets);
    expect(hypertrophy[0].exercises[0].repRange).toEqual(source[0].exercises[0].repRange);
  });
});

describe("set validation and session calculations", () => {
  it("accepts zero weight with positive whole reps", () => {
    expect(setValidationError({ weight: 0, reps: 8, completed: false })).toBeNull();
  });

  it("rejects negative weight, zero reps, and fractional reps", () => {
    expect(setValidationError({ weight: -1, reps: 8, completed: false })).toMatch(/Weight/);
    expect(setValidationError({ weight: 10, reps: 0, completed: false })).toMatch(/rep/);
    expect(setValidationError({ weight: 10, reps: 8.5, completed: false })).toMatch(/rep/);
  });

  it("counts only valid completed sets in volume", () => {
    const exercise = initialFourDaySplit()[0].exercises[0];
    exercise.sets = [
      { weight: 40, reps: 8, completed: true },
      { weight: 40, reps: 0, completed: true },
      { weight: 50, reps: 8, completed: false },
    ];
    expect(sessionVolume([exercise])).toBe(320);
    expect(isSessionComplete([exercise])).toBe(false);
  });
});

describe("active session lifecycle", () => {
  it("clones a template and resets completion without mutating it", () => {
    const workout = initialFourDaySplit()[0];
    workout.exercises[0].sets[0].completed = true;
    const session = startActiveSession(workout, new Date("2026-01-01T10:00:00.000Z"));
    expect(session.startedAt).toBe("2026-01-01T10:00:00.000Z");
    expect(session.exercises[0].sets[0].completed).toBe(false);
    session.exercises[0].sets[0].weight = 99;
    expect(workout.exercises[0].sets[0].weight).not.toBe(99);
  });

  it("creates a record from valid completed work", () => {
    const session = startActiveSession(initialFourDaySplit()[0], new Date("2026-01-01T10:00:00.000Z"));
    session.exercises[0].sets[2] = { weight: 42.5, reps: 0, completed: true };
    session.exercises[0].sets[3] = { weight: 42.5, reps: 8, completed: true };
    const record = completeActiveSession(session, new Date("2026-01-01T11:00:00.000Z"));
    expect(record.completedAt).toBe("2026-01-01T11:00:00.000Z");
    expect(record.volume).toBe(340);
    expect(record.exercises[0].lastWeight).toBe(42.5);
    expect(record.exercises[0].sets[2].completed).toBe(false);
  });

  it("updates only the source workout and completed exercises", () => {
    const workouts = initialFourDaySplit();
    const session = startActiveSession(workouts[0]);
    session.exercises[0].sets[2] = { weight: 45, reps: 8, completed: true };
    const updated = applySessionPerformance(workouts, session);
    expect(updated[0].exercises[0].lastWeight).toBe(45);
    expect(updated[0].exercises[1].lastWeight).toBe(workouts[0].exercises[1].lastWeight);
    expect(updated[1]).toBe(workouts[1]);
  });
});

describe("warm-up and working sets", () => {
  it("uses 50% and 70% warm-ups before two working sets", () => {
    const workout = initialFourDaySplit()[0];
    workout.exercises[0].lastWeight = 100;
    const exercise = startActiveSession(workout).exercises[0];
    expect(exercise.sets.map((set) => set.weight)).toEqual([50, 70, 100, 100]);
  });

  it("uses one 70% warm-up for a three-set exercise", () => {
    const workout = initialFourDaySplit()[0];
    workout.exercises[1].lastWeight = 80;
    const exercise = startActiveSession(workout).exercises[1];
    expect(exercise.sets.map((set) => set.weight)).toEqual([56, 80, 80]);
  });

  it("rounds warm-ups to the selected machine increment", () => {
    const workout = initialFourDaySplit()[0];
    workout.exercises[0].lastWeight = 85;
    workout.exercises[0].loadingType = "pin-loaded";
    const exercise = startActiveSession(workout).exercises[0];
    expect(exercise.sets.map((set) => set.weight)).toEqual([45, 60, 85, 85]);
  });
});

describe("progression", () => {
  it("recommends an increase after every set reaches the top of the range", () => {
    const exercise = initialFourDaySplit()[0].exercises[0];
    exercise.sets = exercise.sets.map((set) => ({ ...set, reps: exercise.repRange[1], completed: true }));
    expect(progression(exercise)).toMatch(/Ready to increase/);
  });

  it("recommends holding until the rep target is reached", () => {
    expect(progression(initialFourDaySplit()[0].exercises[0])).toMatch(/Progress when/);
  });

  it("uses the performed working load for a newly substituted exercise", () => {
    const exercise = initialFourDaySplit()[0].exercises[0];
    exercise.lastWeight = 0;
    exercise.sets = exercise.sets.map((set, index) => ({ ...set, weight: index >= 2 ? 100 : set.weight, reps: exercise.repRange[1], completed: true }));
    expect(progression(exercise)).toContain("102.5 kg");
  });
});

describe("exercise replacement", () => {
  it("replaces only the requested slot and retains its prescription", () => {
    const workouts = initialFourDaySplit();
    const original = workouts[0].exercises[0];
    const replacement = getExerciseDefinition("dumbbell-bench");
    expect(replacement).toBeDefined();
    const updated = replaceWorkoutExercise(workouts, workouts[0].id, original.id, replacement!);
    expect(updated[0].exercises[0].id).toBe("dumbbell-bench");
    expect(updated[0].exercises[0].targetSets).toBe(original.targetSets);
    expect(updated[0].exercises[0].repRange).toEqual(original.repRange);
    expect(updated[1]).toBe(workouts[1]);
  });

  it("reuses known performance for a replacement already in the program", () => {
    const workouts = initialFourDaySplit();
    const known = workouts[0].exercises.find((exercise) => exercise.id === "machine-chest")!;
    known.lastWeight = 92.5;
    const updated = replaceWorkoutExercise(workouts, workouts[2].id, "incline-machine", { id: known.id, name: known.name });
    expect(updated[2].exercises[0].lastWeight).toBe(92.5);
  });

  it("restores the best historical working-set load for a replacement", () => {
    const workouts = initialFourDaySplit();
    const historical = {
      ...workouts[0].exercises[0],
      id: "dumbbell-bench",
      name: "Dumbbell Bench Press",
      loadingType: "plate-loaded" as const,
      sets: workouts[0].exercises[0].sets.map((set, index) => ({ ...set, weight: index === 2 ? 90 : index === 3 ? 100 : 40, completed: true })),
    };
    const records = [{ id: "history", completedAt: "2026-07-27T10:00:00.000Z", workoutTitle: "Upper", exercises: [historical], volume: 0 }];
    const updated = replaceWorkoutExercise(workouts, "upper-a", "incline-smith", { id: "dumbbell-bench", name: "Dumbbell Bench Press" }, records);
    expect(updated[0].exercises[0].lastWeight).toBe(100);
    expect(updated[0].exercises[0].loadingType).toBe("plate-loaded");
    expect(updated[0].exercises[0].sets.map((set) => set.weight)).toEqual([50, 70, 100, 100]);
  });
});

describe("loading type requirement", () => {
  it("reports exercises that are not configured", () => {
    const workout = initialFourDaySplit()[0];
    workout.exercises[0].loadingType = "plate-loaded";
    expect(exercisesMissingLoadingType(workout)).toHaveLength(workout.exercises.length - 1);
    workout.exercises.forEach((exercise) => { exercise.loadingType = "pin-loaded"; });
    expect(exercisesMissingLoadingType(workout)).toEqual([]);
  });
});
