export type WeightUnit = "kg" | "lb";
export type SetLog = { weight: number; reps: number; completed: boolean };
export type LoadingType = "pin-loaded" | "plate-loaded";
export type ReadinessCheckIn = { energy: number; sleep: number; soreness: number };
export type ReadinessAdjustment = {
  score: number;
  level: "ready" | "moderate" | "low";
  loadScale: number;
  setReduction: number;
  summary: string;
};

export type Exercise = {
  id: string;
  name: string;
  targetSets: number;
  repRange: [number, number];
  lastWeight: number;
  lastReps: number;
  sets: SetLog[];
  selectionReason?: string;
  loadingType?: LoadingType;
  loadIncrement?: number;
  restSeconds?: number;
};

export type Workout = { id: string; title: string; focus: string; exercises: Exercise[] };
export type SessionRecord = { id: string; sourceWorkoutId?: string; startedAt?: string; completedAt: string; durationSeconds?: number; notes?: string; deload?: boolean; readiness?: ReadinessCheckIn & { score: number; level: ReadinessAdjustment["level"] }; workoutTitle: string; exercises: Exercise[]; volume: number };
export type ActiveSession = { id: string; workoutId: string; workoutTitle: string; focus: string; startedAt: string; notes: string; deload?: boolean; readiness?: ReadinessCheckIn & { score: number; level: ReadinessAdjustment["level"] }; exercises: Exercise[] };
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
    notes: "",
    exercises: workout.exercises.map((exercise) => applyWarmupLoads(exercise)),
  };
}

export function startDeloadSession(workout: Workout, now = new Date()): ActiveSession {
  return applyDeloadToSession(startActiveSession(workout, now));
}

export function applyDeloadToSession(session: ActiveSession): ActiveSession {
  return {
    ...session,
    focus: `${session.focus} · Deload 75%`,
    deload: true,
    exercises: session.exercises.map((exercise) => applyWarmupLoads(
      exercise,
      roundExerciseLoad(exercise.lastWeight * 0.75, exercise),
    )),
  };
}

export function workingSetStartIndex(exercise: Exercise): number {
  return Math.max(0, exercise.sets.length - 2);
}

export function isWorkingSet(exercise: Exercise, setIndex: number): boolean {
  return setIndex >= workingSetStartIndex(exercise);
}

export function workingSets(exercise: Exercise): SetLog[] {
  return exercise.sets.slice(workingSetStartIndex(exercise));
}

export function bestCompletedWorkingSet(exercise: Exercise): SetLog | undefined {
  return workingSets(exercise)
    .filter((set) => set.completed && !setValidationError(set))
    .reduce<SetLog | undefined>((best, set) => !best || set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps) ? set : best, undefined);
}

export function applyWarmupLoads(exercise: Exercise, workingWeight = exercise.lastWeight): Exercise {
  const warmupCount = workingSetStartIndex(exercise);
  return {
    ...exercise,
    sets: exercise.sets.map((set, index) => {
      const scale = warmupCount === 2 && index === 0 ? 0.5 : index < warmupCount ? 0.7 : 1;
      return { ...set, weight: roundExerciseLoad(workingWeight * scale, exercise), completed: false };
    }),
  };
}

export function exercisesMissingLoadingType(workout: Workout): Exercise[] {
  return workout.exercises.filter((exercise) => !exercise.loadingType);
}

export function evaluateReadiness(checkIn: ReadinessCheckIn): ReadinessAdjustment {
  const values = [checkIn.energy, checkIn.sleep, checkIn.soreness];
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 5)) throw new Error("Readiness values must be whole numbers from 1 to 5.");
  const score = Math.round(((checkIn.energy + checkIn.sleep + (6 - checkIn.soreness)) / 15) * 100);
  if (score < 47) return { score, level: "low", loadScale: 0.85, setReduction: 1, summary: "Recovery is low. Reduce each exercise by one set and use 85% of the planned load." };
  if (score < 67) return { score, level: "moderate", loadScale: 0.9, setReduction: 0, summary: "Recovery is moderate. Keep the planned sets and use 90% of the planned load." };
  return { score, level: "ready", loadScale: 1, setReduction: 0, summary: "You are ready for the planned session." };
}

export function startRecoveryAwareSession(workout: Workout, checkIn: ReadinessCheckIn, now = new Date()): ActiveSession {
  const adjustment = evaluateReadiness(checkIn);
  const session = startActiveSession(workout, now);
  return {
    ...session,
    focus: adjustment.level === "ready" ? session.focus : `${session.focus} · ${adjustment.level === "low" ? "Recovery session" : "Adjusted effort"}`,
    readiness: { ...checkIn, score: adjustment.score, level: adjustment.level },
    exercises: session.exercises.map((exercise) => {
      const targetSets = Math.max(1, exercise.targetSets - adjustment.setReduction);
      return applyWarmupLoads({
        ...exercise,
        targetSets,
        sets: exercise.sets.slice(0, targetSets),
      }, roundExerciseLoad(exercise.lastWeight * adjustment.loadScale, exercise));
    }),
  };
}

export function completeActiveSession(session: ActiveSession, now = new Date()): SessionRecord {
  return {
    id: session.id,
    sourceWorkoutId: session.workoutId,
    startedAt: session.startedAt,
    completedAt: now.toISOString(),
    durationSeconds: Math.max(0, Math.round((now.getTime() - new Date(session.startedAt).getTime()) / 1000)),
    notes: session.notes,
    deload: session.deload,
    readiness: session.readiness,
    workoutTitle: session.workoutTitle,
    exercises: session.exercises.map((exercise) => {
      const best = bestCompletedWorkingSet(exercise);
      return {
        ...exercise,
        lastWeight: best?.weight ?? exercise.lastWeight,
        lastReps: best?.reps ?? exercise.lastReps,
        sets: exercise.sets.map((set) => ({ weight: set.weight, reps: set.reps, completed: set.completed && !setValidationError(set) })),
      };
    }),
    volume: sessionVolume(session.exercises),
  };
}

export function repeatSessionFromRecord(record: SessionRecord, records: SessionRecord[], now = new Date(), currentWorkouts: Workout[] = [], deload = false): ActiveSession {
  const session: ActiveSession = {
    id: String(now.getTime()),
    workoutId: record.sourceWorkoutId ?? `repeat-${record.id}`,
    workoutTitle: record.workoutTitle,
    focus: "Repeated from workout history",
    startedAt: now.toISOString(),
    notes: "",
    exercises: record.exercises.map((recordedExercise) => {
      const current = currentWorkouts.flatMap((workout) => workout.exercises).find((exercise) => exercise.id === recordedExercise.id);
      const latest = latestPerformedExercise(records, recordedExercise.id) ?? current ?? recordedExercise;
      const best = bestCompletedWorkingSet(latest);
      const workingWeight = best?.weight ?? latest.lastWeight ?? recordedExercise.lastWeight;
      const lastReps = best?.reps ?? latest.lastReps ?? recordedExercise.lastReps;
      return applyWarmupLoads({
        ...recordedExercise,
        loadingType: current?.loadingType ?? latest.loadingType ?? recordedExercise.loadingType,
        loadIncrement: current?.loadIncrement ?? latest.loadIncrement ?? recordedExercise.loadIncrement,
        restSeconds: current?.restSeconds ?? latest.restSeconds ?? recordedExercise.restSeconds,
        lastWeight: workingWeight,
        lastReps,
        sets: Array.from({ length: recordedExercise.sets.length }, (_, index) => ({
          weight: workingWeight,
          reps: recordedExercise.sets[index]?.reps || recordedExercise.repRange[0],
          completed: false,
        })),
      }, workingWeight);
    }),
  };
  return deload ? applyDeloadToSession(session) : session;
}

function latestPerformedExercise(records: SessionRecord[], exerciseId: string): Exercise | undefined {
  return records
    .filter((item) => !item.deload && item.exercises.some((exercise) => exercise.id === exerciseId))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .map((item) => item.exercises.find((exercise) => exercise.id === exerciseId))
    .find((exercise): exercise is Exercise => Boolean(exercise));
}

export function applySessionPerformance(workouts: Workout[], session: ActiveSession): Workout[] {
  if (session.deload) return workouts;
  return workouts.map((workout) => workout.id !== session.workoutId ? workout : {
    ...workout,
    exercises: workout.exercises.map((exercise) => {
      const performed = session.exercises.find((item) => item.id === exercise.id);
      const best = performed ? bestCompletedWorkingSet(performed) : undefined;
      if (!best) return exercise;
      return applyWarmupLoads({
        ...exercise,
        lastWeight: best.weight,
        lastReps: best.reps,
        sets: exercise.sets.map((set, index) => ({ ...(performed?.sets[index] ?? set), completed: false })),
      }, best.weight);
    }),
  });
}

export function replaceWorkoutExercise(workouts: Workout[], workoutId: string, exerciseId: string, replacement: { id: string; name: string }, records: SessionRecord[] = []): Workout[] {
  const known = workouts.flatMap((workout) => workout.exercises).find((exercise) => exercise.id === replacement.id);
  const historical = records
    .flatMap((record) => record.exercises)
    .filter((exercise) => exercise.id === replacement.id)
    .map((exercise) => ({ exercise, best: bestCompletedWorkingSet(exercise) }))
    .filter((item): item is { exercise: Exercise; best: SetLog } => Boolean(item.best))
    .reduce<{ exercise: Exercise; best: SetLog } | undefined>((best, item) => !best || item.best.weight > best.best.weight || (item.best.weight === best.best.weight && item.best.reps > best.best.reps) ? item : best, undefined);
  const bestWeight = Math.max(known?.lastWeight ?? 0, historical?.best.weight ?? 0);
  const bestReps = historical?.best.weight === bestWeight ? historical.best.reps : known?.lastReps;
  return workouts.map((workout) => workout.id !== workoutId ? workout : {
    ...workout,
    exercises: workout.exercises.map((exercise) => exercise.id !== exerciseId ? exercise : applyWarmupLoads({
      ...exercise,
      id: replacement.id,
      name: replacement.name,
      loadingType: known?.loadingType ?? historical?.exercise.loadingType,
      lastWeight: bestWeight,
      lastReps: bestReps ?? exercise.repRange[0],
      sets: Array.from({ length: exercise.targetSets }, () => ({ weight: bestWeight, reps: bestReps ?? exercise.repRange[0], completed: false })),
    }, bestWeight)),
  });
}

export function progression(exercise: Exercise, unit: WeightUnit = "kg"): string {
  const completed = workingSets(exercise).filter((set) => set.completed);
  const best = bestCompletedWorkingSet(exercise);
  if (completed.length === Math.min(2, exercise.sets.length) && completed.every((set) => set.reps >= exercise.repRange[1]) && best) return `Ready to increase: try ${displayExerciseWeight(best.weight + loadIncrement({ ...exercise, lastWeight: best.weight }), exercise, unit)} ${exerciseWeightLabel(exercise, unit)} next time`;
  return `Progress when both working sets reach ${exercise.repRange[1]} reps`;
}

export function loadIncrement(exercise: Exercise): number {
  if (exercise.loadIncrement && exercise.loadIncrement > 0) return exercise.loadIncrement;
  if (exercise.loadingType === "pin-loaded") return 5;
  if (exercise.loadingType === "plate-loaded") return 2.5;
  return exercise.lastWeight >= 50 ? 2.5 : 1;
}

export function roundToIncrement(weight: number, loadingType?: LoadingType): number {
  const increment = loadingType === "pin-loaded" ? 5 : loadingType === "plate-loaded" ? 2.5 : 0.5;
  return Math.max(0, Math.round(weight / increment) * increment);
}

export function roundExerciseLoad(weight: number, exercise: Exercise): number {
  if (!exercise.loadIncrement) return roundToIncrement(weight, exercise.loadingType);
  const increment = exercise.loadIncrement;
  return Math.max(0, Math.round(weight / increment) * increment);
}

export function displayWeight(weightKg: number, unit: WeightUnit): number {
  const value = unit === "lb" ? weightKg * 2.2046226218 : weightKg;
  return Math.round(value * 10) / 10;
}

export function storedWeight(displayedWeight: number, unit: WeightUnit): number {
  const value = unit === "lb" ? displayedWeight / 2.2046226218 : displayedWeight;
  return Math.round(value * 100) / 100;
}

export function displayExerciseWeight(weightKg: number, exercise: Pick<Exercise, "loadingType">, unit: WeightUnit): number {
  if (exercise.loadingType !== "plate-loaded") return displayWeight(weightKg, unit);
  const perSideKg = weightKg / 2;
  return unit === "kg" ? Math.round(perSideKg * 100) / 100 : displayWeight(perSideKg, unit);
}

export function storedExerciseWeight(displayedWeight: number, exercise: Pick<Exercise, "loadingType">, unit: WeightUnit): number {
  const weightKg = storedWeight(displayedWeight, unit);
  return exercise.loadingType === "plate-loaded" ? weightKg * 2 : weightKg;
}

export function exerciseWeightLabel(exercise: Pick<Exercise, "loadingType">, unit: WeightUnit): string {
  return exercise.loadingType === "plate-loaded" ? `${weightUnitLabel(unit)}/side` : weightUnitLabel(unit);
}

export function weightUnitLabel(unit: WeightUnit): string {
  return unit === "lb" ? "lb" : "kg";
}

export function updateExercisePrescription(exercise: Exercise, changes: { name?: string; targetSets?: number; repRange?: [number, number]; loadIncrement?: number; restSeconds?: number }): Exercise {
  const targetSets = Math.max(2, Math.min(8, changes.targetSets ?? exercise.targetSets));
  const repRange = changes.repRange ?? exercise.repRange;
  const sets = Array.from({ length: targetSets }, (_, index) => exercise.sets[index] ?? {
    weight: exercise.lastWeight,
    reps: repRange[0],
    completed: false,
  });
  return applyWarmupLoads({
    ...exercise,
    ...changes,
    targetSets,
    repRange: [Math.max(1, repRange[0]), Math.max(repRange[0], repRange[1])],
    sets,
  });
}

export function moveWorkoutExercise(workout: Workout, exerciseId: string, direction: -1 | 1): Workout {
  const index = workout.exercises.findIndex((exercise) => exercise.id === exerciseId);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= workout.exercises.length) return workout;
  const exercises = [...workout.exercises];
  [exercises[index], exercises[destination]] = [exercises[destination], exercises[index]];
  return { ...workout, exercises };
}

export function createCustomExercise(name: string, now = new Date()): Exercise {
  return {
    id: `custom-${now.getTime()}`,
    name: name.trim(),
    targetSets: 4,
    repRange: [8, 12],
    lastWeight: 0,
    lastReps: 8,
    loadIncrement: 2.5,
    restSeconds: 90,
    sets: Array.from({ length: 4 }, () => ({ weight: 0, reps: 8, completed: false })),
  };
}
