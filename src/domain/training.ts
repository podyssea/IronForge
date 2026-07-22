export type SetLog = { weight: number; reps: number; completed: boolean };

export type Exercise = {
  id: string;
  name: string;
  targetSets: number;
  repRange: [number, number];
  lastWeight: number;
  lastReps: number;
  sets: SetLog[];
};

export type Workout = { id: string; title: string; focus: string; exercises: Exercise[] };
export type SessionRecord = { id: string; completedAt: string; workoutTitle: string; exercises: Exercise[]; volume: number };
export type ActiveSession = { id: string; workoutId: string; workoutTitle: string; focus: string; startedAt: string; exercises: Exercise[] };
export type TrainingPhase = "strength" | "hypertrophy" | "deload";
type SeedExercise = Omit<Exercise, "sets">;

function exercise(id: string, name: string, targetSets: number, repRange: [number, number], weight: number): SeedExercise {
  return { id, name, targetSets, repRange, lastWeight: weight, lastReps: repRange[0] };
}

function hydrate(items: SeedExercise[]): Exercise[] {
  return items.map((item) => ({ ...item, sets: Array.from({ length: item.targetSets }, () => ({ weight: item.lastWeight, reps: item.lastReps, completed: false })) }));
}

function withKnownLoads(workouts: Workout[], existing: Workout[]): Workout[] {
  const known = new Map(existing.flatMap((workout) => workout.exercises.map((item) => [item.id, item.lastWeight])));
  return workouts.map((workout) => ({ ...workout, exercises: workout.exercises.map((item) => {
    const weight = known.get(item.id);
    return weight === undefined ? item : { ...item, lastWeight: weight, sets: item.sets.map((set) => ({ ...set, weight })) };
  }) }));
}

export function initialFourDaySplit(): Workout[] {
  return [
    { id: "upper-a", title: "Monday · Upper A", focus: "Strength bias", exercises: hydrate([
      exercise("incline-smith", "Incline Smith Press", 4, [6, 8], 35), exercise("machine-chest", "Machine Chest Press", 3, [8, 10], 80),
      exercise("pull-ups", "Weighted Pull-Ups", 4, [6, 8], 0), exercise("tbar-row", "Chest-Supported T-Bar Row", 3, [8, 10], 20),
      exercise("lateral-raise", "Cable Lateral Raise", 3, [12, 15], 5), exercise("preacher-curl", "Unilateral Preacher Curl", 4, [8, 10], 40), exercise("pushdown", "Cambered Bar Pushdown", 4, [8, 10], 40)
    ]) },
    { id: "lower-a", title: "Tuesday · Lower A", focus: "Posterior chain", exercises: hydrate([
      exercise("rdl", "RDL", 4, [6, 8], 40), exercise("seated-leg-curl", "Seated Leg Curl", 4, [10, 12], 70), exercise("walking-lunges", "Walking Lunges", 3, [10, 12], 10), exercise("leg-press", "Leg Press", 3, [10, 12], 145), exercise("standing-calf", "Standing Calf Raise", 4, [10, 15], 70), exercise("abductors", "Abductors Machine", 3, [8, 12], 85)
    ]) },
    { id: "upper-b", title: "Thursday · Upper B", focus: "Hypertrophy bias", exercises: hydrate([
      exercise("incline-machine", "Incline Chest Press Machine", 3, [10, 12], 40), exercise("pec-deck", "Pec Deck Fly", 3, [12, 15], 30), exercise("pullover", "Lat Pullover", 3, [10, 12], 12), exercise("single-arm-row", "Single Arm Row", 3, [10, 12], 10), exercise("shoulder-press", "Shoulder Press", 3, [8, 10], 30), exercise("rear-delt", "Rear Delt Fly", 3, [12, 15], 30), exercise("hammer-curl", "Unilateral Hammer Curl", 4, [10, 12], 40), exercise("overhead-extension", "Laying Overhead DB Extension", 4, [10, 12], 10)
    ]) },
    { id: "lower-b", title: "Friday · Lower B", focus: "Quad bias", exercises: hydrate([
      exercise("hack-squat", "Hack Squat", 4, [8, 10], 60), exercise("panatta", "Panatta Press", 3, [8, 10], 60), exercise("leg-extension", "Leg Extension", 3, [12, 15], 30), exercise("adductor", "Adductor Machine", 3, [12, 15], 38), exercise("lying-curl", "Lying Leg Curl", 3, [10, 12], 35), exercise("seated-calf", "Seated Calf Raise", 4, [12, 15], 100)
    ]) }
  ];
}

export function buildSplit(days: number): Workout[] {
  return generateFromStyle(days, []);
}

export function generateFromStyle(days: number, existing: Workout[]): Workout[] {
  const base = initialFourDaySplit();
  const upperA = base[0], lowerA = base[1], upperB = base[2], lowerB = base[3];
  const fullA: Workout = { id: "full-a", title: "Day 1 · Full Body A", focus: "Strength & posterior-chain emphasis", exercises: [...upperA.exercises.slice(0, 4), ...lowerA.exercises.slice(0, 2)] };
  const fullB: Workout = { id: "full-b", title: "Day 2 · Full Body B", focus: "Hypertrophy & quad emphasis", exercises: [...lowerB.exercises.slice(0, 3), ...upperB.exercises.slice(0, 4)] };
  const lowerHybrid: Workout = { id: "lower-hybrid", title: "Day 2 · Lower Hybrid", focus: "Balanced quads and hamstrings", exercises: [...lowerA.exercises.slice(0, 2), ...lowerB.exercises.slice(0, 3)] };
  const pump: Workout = { id: "upper-pump", title: "Day 5 · Upper Pump", focus: "Chest, back and arms hypertrophy", exercises: [...upperB.exercises.slice(0, 4), ...upperA.exercises.slice(4)] };
  const templates: Record<number, Workout[]> = {
    2: [fullA, fullB],
    3: [{ ...upperA, title: "Day 1 · Upper Strength" }, lowerHybrid, { ...upperB, title: "Day 3 · Upper Hypertrophy" }],
    4: base,
    5: [...base, pump],
    6: [...base, { ...upperA, id: "upper-a-2", title: "Day 5 · Upper A Repeat" }, { ...lowerA, id: "lower-a-2", title: "Day 6 · Lower A Repeat" }]
  };
  return withKnownLoads(templates[Math.max(2, Math.min(6, days))] ?? base, existing);
}

export function applyTrainingPhase(workouts: Workout[], phase: TrainingPhase): Workout[] {
  if (phase === "hypertrophy") return workouts.map((workout) => ({ ...workout, focus: "Hypertrophy · muscle-building volume" }));
  return workouts.map((workout) => ({ ...workout, focus: phase === "strength" ? "Strength · heavier, focused work" : "Deload · recover and rebuild", exercises: workout.exercises.map((exercise) => {
    const targetSets = phase === "strength" ? Math.max(3, exercise.targetSets - (exercise.targetSets >= 4 ? 1 : 0)) : Math.max(1, Math.ceil(exercise.targetSets / 2));
    const repRange: [number, number] = phase === "strength" ? [Math.max(3, exercise.repRange[0] - 3), Math.max(5, exercise.repRange[1] - 3)] : [exercise.repRange[0], Math.max(exercise.repRange[0], exercise.repRange[1] - 2)];
    const scale = phase === "deload" ? 0.85 : 1;
    const sets = Array.from({ length: targetSets }, (_, index) => {
      const source = exercise.sets[index] ?? exercise.sets[exercise.sets.length - 1];
      return { ...source, weight: Math.round(source.weight * scale * 2) / 2, reps: Math.min(source.reps, repRange[1]), completed: false };
    });
    return { ...exercise, targetSets, repRange, sets };
  }) }));
}

export function sessionVolume(exercises: Exercise[]): number {
  return exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.completed && !setValidationError(set)).reduce((sum, set) => sum + set.weight * set.reps, 0), 0);
}

export function setValidationError(set: SetLog): string | null {
  if (!Number.isFinite(set.weight) || set.weight < 0) return "Weight must be zero or greater";
  if (!Number.isInteger(set.reps) || set.reps < 1) return "Enter at least 1 rep";
  return null;
}

export function isSessionComplete(exercises: Exercise[]): boolean {
  return exercises.every((exercise) => exercise.sets.every((set) => set.completed && !setValidationError(set)));
}

export function startActiveSession(workout: Workout, now = new Date()): ActiveSession {
  return {
    id: String(now.getTime()),
    workoutId: workout.id,
    workoutTitle: workout.title,
    focus: workout.focus,
    startedAt: now.toISOString(),
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => ({ ...set, completed: false })),
    })),
  };
}

export function completeActiveSession(session: ActiveSession, now = new Date()): SessionRecord {
  return {
    id: session.id,
    completedAt: now.toISOString(),
    workoutTitle: session.workoutTitle,
    exercises: session.exercises.map((exercise) => {
      const completed = exercise.sets.filter((set) => set.completed && !setValidationError(set));
      const latest = completed[completed.length - 1];
      return {
        ...exercise,
        lastWeight: latest?.weight ?? exercise.lastWeight,
        lastReps: latest?.reps ?? exercise.lastReps,
        sets: exercise.sets.map((set) => ({ ...set, completed: set.completed && !setValidationError(set) })),
      };
    }),
    volume: sessionVolume(session.exercises),
  };
}

export function applySessionPerformance(workouts: Workout[], session: ActiveSession): Workout[] {
  return workouts.map((workout) => workout.id !== session.workoutId ? workout : {
    ...workout,
    exercises: workout.exercises.map((exercise) => {
      const performed = session.exercises.find((item) => item.id === exercise.id);
      const completed = performed?.sets.filter((set) => set.completed && !setValidationError(set)) ?? [];
      const latest = completed[completed.length - 1];
      if (!latest) return exercise;
      return {
        ...exercise,
        lastWeight: latest.weight,
        lastReps: latest.reps,
        sets: exercise.sets.map((set, index) => ({ ...(performed?.sets[index] ?? set), completed: false })),
      };
    }),
  });
}

export function replaceWorkoutExercise(workouts: Workout[], workoutId: string, exerciseId: string, replacement: { id: string; name: string }): Workout[] {
  const known = workouts.flatMap((workout) => workout.exercises).find((exercise) => exercise.id === replacement.id);
  return workouts.map((workout) => workout.id !== workoutId ? workout : {
    ...workout,
    exercises: workout.exercises.map((exercise) => exercise.id !== exerciseId ? exercise : {
      ...exercise,
      id: replacement.id,
      name: replacement.name,
      lastWeight: known?.lastWeight ?? 0,
      lastReps: known?.lastReps ?? exercise.repRange[0],
      sets: Array.from({ length: exercise.targetSets }, (_, index) => {
        const prior = known?.sets[index];
        return { weight: prior?.weight ?? known?.lastWeight ?? 0, reps: prior?.reps ?? known?.lastReps ?? exercise.repRange[0], completed: false };
      }),
    }),
  });
}

export function progression(exercise: Exercise): string {
  const completed = exercise.sets.filter((set) => set.completed);
  if (completed.length === exercise.targetSets && completed.every((set) => set.reps >= exercise.repRange[1])) return `Ready to increase: try ${exercise.lastWeight + (exercise.lastWeight >= 50 ? 2.5 : 1)} kg next time`;
  return `Progress when all working sets reach ${exercise.repRange[1]} reps`;
}
