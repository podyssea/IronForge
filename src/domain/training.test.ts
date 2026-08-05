import { describe, expect, it } from "vitest";
import { applySessionPerformance, applyTrainingPhase, completeActiveSession, createCustomExercise, displayExerciseWeight, displayWeight, exercisesMissingLoadingType, generateFromStyle, initialFourDaySplit, isSessionComplete, moveWorkoutExercise, progression, repeatSessionFromRecord, replaceWorkoutExercise, sessionVolume, setValidationError, startActiveSession, startDeloadSession, storedExerciseWeight, storedWeight, updateExercisePrescription } from "./training";
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

describe("workout deload", () => {
  it("uses 75% working loads and recalculates warm-ups", () => {
    const workout = initialFourDaySplit()[0];
    workout.exercises[0].lastWeight = 100;
    workout.exercises[0].loadingType = "plate-loaded";
    const session = startDeloadSession(workout, new Date("2026-01-01T10:00:00.000Z"));

    expect(session.deload).toBe(true);
    expect(session.focus).toContain("Deload 75%");
    expect(session.exercises[0].sets.map((set) => set.weight)).toEqual([37.5, 52.5, 75, 75]);
    expect(workout.exercises[0].lastWeight).toBe(100);
  });

  it("rounds the reduced weight to the exercise increment", () => {
    const workout = initialFourDaySplit()[0];
    workout.exercises[0].lastWeight = 85;
    workout.exercises[0].loadingType = "pin-loaded";

    expect(startDeloadSession(workout).exercises[0].sets.map((set) => set.weight)).toEqual([35, 45, 65, 65]);
  });

  it("saves deload history without lowering the normal workout prescription", () => {
    const workouts = initialFourDaySplit();
    workouts[0].exercises[0].lastWeight = 100;
    workouts[0].exercises[0].loadingType = "plate-loaded";
    const session = startDeloadSession(workouts[0]);
    session.exercises[0].sets = session.exercises[0].sets.map((set) => ({ ...set, completed: true }));

    expect(completeActiveSession(session).deload).toBe(true);
    expect(applySessionPerformance(workouts, session)).toBe(workouts);
    expect(workouts[0].exercises[0].lastWeight).toBe(100);
  });
});

describe("repeat workout", () => {
  it("recreates a historical workout with the latest load for every exercise", () => {
    const workout = initialFourDaySplit()[0];
    const originalSession = startActiveSession(workout, new Date("2026-01-01T10:00:00.000Z"));
    originalSession.exercises.forEach((exercise) => { exercise.sets = exercise.sets.map((set) => ({ ...set, completed: true })); });
    const original = completeActiveSession(originalSession, new Date("2026-01-01T11:00:00.000Z"));
    const newerSession = startActiveSession(workout, new Date("2026-01-08T10:00:00.000Z"));
    newerSession.exercises[0].sets = newerSession.exercises[0].sets.map((set, index) => ({ ...set, weight: index >= 2 ? 50 : set.weight, reps: 8, completed: true }));
    newerSession.exercises[0].loadingType = "plate-loaded";
    newerSession.exercises[0].loadIncrement = 2.5;
    newerSession.exercises[0].restSeconds = 150;
    const newer = completeActiveSession(newerSession, new Date("2026-01-08T11:00:00.000Z"));

    const repeated = repeatSessionFromRecord(original, [original, newer], new Date("2026-01-10T10:00:00.000Z"));
    expect(repeated.workoutTitle).toBe(original.workoutTitle);
    expect(repeated.exercises.map((exercise) => exercise.id)).toEqual(original.exercises.map((exercise) => exercise.id));
    expect(repeated.exercises[0]).toMatchObject({ lastWeight: 50, loadingType: "plate-loaded", loadIncrement: 2.5, restSeconds: 150 });
    expect(repeated.exercises[0].sets.map((set) => set.weight)).toEqual([25, 35, 50, 50]);
    expect(repeated.exercises.flatMap((exercise) => exercise.sets).every((set) => !set.completed)).toBe(true);
  });

  it("uses an independent identifier when the historical session has no source workout", () => {
    const session = startActiveSession(initialFourDaySplit()[0]);
    const record = completeActiveSession(session);
    record.sourceWorkoutId = undefined;
    expect(repeatSessionFromRecord(record, [record]).workoutId).toBe(`repeat-${record.id}`);
  });

  it("can repeat a historical workout as a 75% deload", () => {
    const workout = initialFourDaySplit()[0];
    workout.exercises[0].lastWeight = 100;
    workout.exercises[0].loadingType = "plate-loaded";
    const record = completeActiveSession(startActiveSession(workout));
    const repeated = repeatSessionFromRecord(record, [record], new Date(), [workout], true);

    expect(repeated.deload).toBe(true);
    expect(repeated.exercises[0].sets.map((set) => set.weight)).toEqual([37.5, 52.5, 75, 75]);
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

  it("uses a custom exercise increment for warm-ups", () => {
    const workout = initialFourDaySplit()[0];
    workout.exercises[0].lastWeight = 83;
    workout.exercises[0].loadIncrement = 2;
    expect(startActiveSession(workout).exercises[0].sets.map((set) => set.weight)).toEqual([42, 58, 84, 84]);
  });
});

describe("units and workout editing", () => {
  it("converts display units without changing stored kilograms", () => {
    expect(displayWeight(100, "lb")).toBe(220.5);
    expect(storedWeight(220.5, "lb")).toBeCloseTo(100, 1);
  });

  it("shows and accepts plate-loaded weights per side while storing total load", () => {
    const exercise = { loadingType: "plate-loaded" as const };
    expect(displayExerciseWeight(100, exercise, "kg")).toBe(50);
    expect(storedExerciseWeight(50, exercise, "kg")).toBe(100);
    expect(displayExerciseWeight(100, exercise, "lb")).toBe(110.2);
  });

  it("updates prescriptions while retaining two working sets", () => {
    const exercise = updateExercisePrescription(initialFourDaySplit()[0].exercises[0], { targetSets: 5, repRange: [5, 7], loadIncrement: 2, restSeconds: 150 });
    expect(exercise.sets).toHaveLength(5);
    expect(exercise.repRange).toEqual([5, 7]);
    expect(exercise.loadIncrement).toBe(2);
    expect(exercise.restSeconds).toBe(150);
  });

  it("removes sets without allowing fewer than two working sets", () => {
    const exercise = initialFourDaySplit()[0].exercises[0];
    const reduced = updateExercisePrescription(exercise, { targetSets: exercise.targetSets - 1 });
    const minimum = updateExercisePrescription(reduced, { targetSets: 1 });

    expect(reduced.sets).toHaveLength(3);
    expect(minimum.sets).toHaveLength(2);
  });

  it("creates and reorders custom exercises", () => {
    const workout = initialFourDaySplit()[0];
    const custom = createCustomExercise("Cable Y Raise", new Date("2026-01-01T00:00:00.000Z"));
    const withCustom = { ...workout, exercises: [...workout.exercises, custom] };
    const moved = moveWorkoutExercise(withCustom, custom.id, -1);
    expect(custom.name).toBe("Cable Y Raise");
    expect(moved.exercises.at(-2)?.id).toBe(custom.id);
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
