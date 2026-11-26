import type { ExerciseDefinition } from "./exerciseLibrary";
import { calculateDeadliftPlan, CONVENTIONAL_DEADLIFT_ID, DEADLIFT_BAR_KG, deadliftLoadAtOrBelow, isDeadliftCalculatorInput, isDeadliftWorkingWeight, MAX_DEADLIFT_PLANNED_REPS, type DeadliftCalculatorInput } from "./deadlift";

export type WeightUnit = "kg" | "lb";
export type CalendarDate = string & { readonly __brand: "CalendarDate" };
export type SetLog = { weight: number; reps: number | null; completed: boolean };
export type TrackedSetLog = SetLog & { reps: number };
export type ExerciseLogFormat = "legacy-set-v1" | "exercise-summary-v1";
export type PerformedExercise =
  | { kind: "legacy-sets" | "working-sets"; sets: TrackedSetLog[]; volume: number }
  | { kind: "summary"; workingWeight: number; workingSetCount: number; representativeReps: number | null }
  | { kind: "unavailable"; reason: "no-completed-sets" | "inconsistent-summary" };
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
  restSecondsMax?: number;
  rirRange?: [number, number];
  programmedWorkingSets?: boolean;
  workingSetCount?: number;
  supersetId?: string;
  deadliftCalculator?: DeadliftCalculatorInput;
  deadliftPlanLogged?: true;
};

export type Workout = { id: string; title: string; focus: string; exercises: Exercise[]; estimatedDurationMinutes?: [number, number]; strengthPriority?: string };
export type SessionRecord = { id: string; sourceWorkoutId?: string; startedAt?: string; completedAt: string; performedOn?: CalendarDate; entryMode?: "backfill"; durationSeconds?: number; notes?: string; deload?: boolean; readiness?: ReadinessCheckIn & { score: number; level: ReadinessAdjustment["level"] }; workoutTitle: string; exercises: Exercise[]; exerciseLogFormat?: ExerciseLogFormat; volume: number | null };
export type ActiveSession = { id: string; workoutId: string; workoutTitle: string; focus: string; startedAt: string; notes: string; focusedExerciseId?: string; deload?: boolean; readiness?: ReadinessCheckIn & { score: number; level: ReadinessAdjustment["level"] }; estimatedDurationMinutes?: [number, number]; strengthPriority?: string; exercises: Exercise[]; exerciseLogFormat?: ExerciseLogFormat };
export type TrainingPhase = "strength" | "hypertrophy" | "deload";
type SeedExercise = Omit<Exercise, "sets">;
const DEADLIFT_RAMP_PERCENTAGES = [0.6, 0.675, 0.75, 0.825, 0.9, 1] as const;

export function isThreeByThreeExercise(exercise: Pick<Exercise, "id">): boolean {
  return exercise.id === CONVENTIONAL_DEADLIFT_ID;
}

export function canonicalExerciseName(exercise: Pick<Exercise, "id" | "name">): string {
  const definition = getExerciseDefinition(exercise.id);
  if (definition?.primaryMuscles.includes("triceps") || /\btriceps?\b/i.test(exercise.name)) return "Tricep Exercise";
  if (definition?.primaryMuscles.includes("biceps") || /\bbiceps?\b/i.test(exercise.name)) return "Bicep Exercise";
  return exercise.name;
}

function exercise(id: string, name: string, targetSets: number, repRange: [number, number], weight: number): SeedExercise {
  return { id, name, targetSets, repRange, lastWeight: weight, lastReps: repRange[0] };
}

function hydrate(items: SeedExercise[]): Exercise[] {
  return items.map((item) => {
    const targetSets = getExerciseDefinition(item.id)?.modality === "isolation" ? 3 : item.targetSets;
    return applyWarmupLoads(normalizeExercisePrescription({ ...item, targetSets, sets: Array.from({ length: targetSets }, () => ({ weight: item.lastWeight, reps: item.lastReps, completed: false })) }));
  });
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
    const targetSets = phase === "strength"
      ? Math.min(5, Math.max(3, exercise.targetSets - (exercise.targetSets >= 4 ? 1 : 0)))
      : isThreeByThreeExercise(exercise) ? Math.max(1, Math.ceil(exercise.targetSets / 2)) : Math.max(2, Math.ceil(exercise.targetSets / 2));
    const repRange: [number, number] = phase === "strength" ? [Math.max(3, exercise.repRange[0] - 3), Math.max(5, exercise.repRange[1] - 3)] : [exercise.repRange[0], Math.max(exercise.repRange[0], exercise.repRange[1] - 2)];
    const scale = phase === "deload" ? 0.85 : 1;
    const sets = Array.from({ length: targetSets }, (_, index) => {
      const source = exercise.sets[index] ?? exercise.sets[exercise.sets.length - 1];
      return { ...source, weight: Math.round(source.weight * scale * 2) / 2, reps: Math.min(source.reps ?? exercise.lastReps, repRange[1]), completed: false };
    });
    return { ...exercise, targetSets, repRange, sets };
  }) }));
}

export function sessionVolume(exercises: Exercise[]): number {
  return exercises.reduce((total, exercise) => total + exercise.sets.filter((set, index): set is TrackedSetLog => set.completed && hasTrackedReps(set) && !setValidationError(set, exercise, index)).reduce((sum, set) => sum + set.weight * set.reps, 0), 0);
}

export function hasTrackedReps(set: SetLog): set is TrackedSetLog {
  return set.reps !== null;
}

export function setValidationError(set: SetLog, exercise?: Exercise, setIndex = 0): string | null {
  if (!Number.isFinite(set.weight) || set.weight < 0) return "Weight must be zero or greater";
  const minimumReps = exercise ? Math.min(6, exercise.repRange[0]) : 6;
  if (set.reps === null || !Number.isInteger(set.reps) || set.reps < minimumReps) return `Enter at least ${minimumReps} reps`;
  return null;
}

export function isSessionComplete(exercises: Exercise[]): boolean {
  return exercises.every((exercise) => exercise.sets.every((set, index) => set.completed && !setValidationError(set, exercise, index)));
}

export function startActiveSession(workout: Workout, now = new Date()): ActiveSession {
  const exercises = workout.exercises.map((exercise) => {
    const normalized = normalizeLegacyExercisePrescription(exercise);
    const reset = { ...normalized, sets: normalized.sets.map((set) => ({ ...set, completed: false })) };
    const warmupSets = reset.sets.slice(0, workingSetStartIndex(reset));
    return isThreeByThreeExercise(reset) || warmupSets.every((set) => set.weight >= reset.lastWeight)
      ? applyWarmupLoads(reset)
      : reset;
  });
  return {
    id: String(now.getTime()),
    workoutId: workout.id,
    workoutTitle: workout.title,
    focus: workout.focus,
    estimatedDurationMinutes: workout.estimatedDurationMinutes,
    strengthPriority: workout.strengthPriority,
    startedAt: now.toISOString(),
    notes: "",
    exerciseLogFormat: "legacy-set-v1",
    focusedExerciseId: exercises[0]?.id,
    exercises,
  };
}

export function startExerciseSummarySession(workout: Workout, records: SessionRecord[], now = new Date()): ActiveSession {
  const exercises = workout.exercises.map((exercise) => {
    if (exercise.id === CONVENTIONAL_DEADLIFT_ID) {
      const prescription = normalizeExercisePrescription(exercise);
      const history = latestSummarySeed(records, prescription.id, prescription);
      const workingWeight = deadliftLoadAtOrBelow(history?.workingWeight ?? 0);
      return {
        ...prescription,
        lastWeight: workingWeight,
        workingSetCount: prescription.targetSets,
        sets: prescription.sets.map(() => ({ weight: workingWeight, reps: null, completed: false })),
      };
    }
    const seed = latestSummarySeed(records, exercise.id) ?? {
      workingWeight: exercise.lastWeight,
      workingSetCount: Math.max(1, workingSets(exercise).length || exercise.targetSets),
    };
    return {
      ...exercise,
      lastWeight: seed.workingWeight,
      targetSets: seed.workingSetCount,
      workingSetCount: seed.workingSetCount,
      sets: Array.from({ length: seed.workingSetCount }, () => ({ weight: seed.workingWeight, reps: null, completed: false })),
    };
  });
  return {
    id: String(now.getTime()),
    workoutId: workout.id,
    workoutTitle: workout.title,
    focus: workout.focus,
    estimatedDurationMinutes: workout.estimatedDurationMinutes,
    strengthPriority: workout.strengthPriority,
    startedAt: now.toISOString(),
    notes: "",
    exerciseLogFormat: "exercise-summary-v1",
    focusedExerciseId: exercises[0]?.id,
    exercises,
  };
}

export function startDeloadExerciseSummarySession(workout: Workout, records: SessionRecord[], now = new Date()): ActiveSession {
  return applySummaryDeload(startExerciseSummarySession(workout, records, now));
}

export function repeatExerciseSummarySession(record: SessionRecord, records: SessionRecord[], now = new Date(), currentWorkouts: Workout[] = [], deload = false): ActiveSession {
  const currentWorkout = currentWorkouts.find((workout) => workout.id === record.sourceWorkoutId);
  const workout: Workout = {
    id: record.sourceWorkoutId ?? `repeat-${record.id}`,
    title: record.workoutTitle,
    focus: "Repeated from workout history",
    exercises: record.exercises.map((recordedExercise) => currentWorkout?.exercises.find((exercise) => exercise.id === recordedExercise.id) ?? recordedExercise),
  };
  const session = startExerciseSummarySession(workout, records, now);
  return deload ? applySummaryDeload(session) : session;
}

function applySummaryDeload(session: ActiveSession): ActiveSession {
  return {
    ...session,
    focus: `${session.focus} · Deload 75%`,
    deload: true,
    exercises: session.exercises.map((exercise) => {
      const reducedWeight = (exercise.sets[0]?.weight ?? exercise.lastWeight) * 0.75;
      const workingWeight = exercise.id === CONVENTIONAL_DEADLIFT_ID
        ? (reducedWeight > 0 ? deadliftLoadAtOrBelow(Math.max(DEADLIFT_BAR_KG, reducedWeight)) : 0)
        : roundExerciseLoad(reducedWeight, exercise);
      return {
        ...exercise,
        lastWeight: workingWeight,
        sets: exercise.sets.map(() => ({ weight: workingWeight, reps: null, completed: false })),
      };
    }),
  };
}

export type ExerciseSummaryChanges = {
  workingWeight?: number;
  workingSetCount?: number;
  representativeReps?: number | null;
  deadliftCalculator?: DeadliftCalculatorInput;
};

export function updateExerciseSummary(session: ActiveSession, exerciseId: string, changes: ExerciseSummaryChanges): ActiveSession {
  if (session.exerciseLogFormat !== "exercise-summary-v1") return session;
  const exercise = session.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return session;
  const current = exercise.sets[0] ?? { weight: exercise.lastWeight, reps: null, completed: false };
  const isDeadlift = exerciseId === CONVENTIONAL_DEADLIFT_ID;
  const completed = exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
  if (changes.deadliftCalculator) {
    const deadliftCalculator = { ...exercise.deadliftCalculator, ...changes.deadliftCalculator };
    if (!isDeadlift || completed || !isDeadliftCalculatorInput(deadliftCalculator)) return session;
    return { ...session, exercises: session.exercises.map((item) => item.id === exerciseId ? { ...item, deadliftCalculator } : item) };
  }
  if (exercise.deadliftPlanLogged) return session;

  const workingWeight = changes.workingWeight ?? current.weight;
  const workingSetCount = changes.workingSetCount ?? Math.max(1, exercise.sets.length);
  const representativeReps = Object.prototype.hasOwnProperty.call(changes, "representativeReps") ? changes.representativeReps ?? null : current.reps;
  if (!Number.isFinite(workingWeight) || workingWeight < 0 || workingWeight > 2_000) return session;
  if (isDeadlift && changes.workingWeight !== undefined && !isDeadliftWorkingWeight(workingWeight)) return session;
  if (!Number.isInteger(workingSetCount) || workingSetCount < 1 || workingSetCount > 20) return session;
  if (representativeReps !== null && (!Number.isInteger(representativeReps) || representativeReps < 1 || representativeReps > 100)) return session;
  return {
    ...session,
    exercises: session.exercises.map((item) => item.id !== exerciseId ? item : {
      ...item,
      lastWeight: workingWeight,
      targetSets: isDeadlift ? item.targetSets : workingSetCount,
      workingSetCount,
      sets: Array.from({ length: workingSetCount }, () => ({ weight: workingWeight, reps: representativeReps, completed })),
    }),
  };
}

export function completeExerciseSummary(session: ActiveSession, exerciseId: string): ActiveSession {
  if (session.exerciseLogFormat !== "exercise-summary-v1") return session;
  const exercise = session.exercises.find((item) => item.id === exerciseId);
  if (!exercise || exercise.sets.every((set) => set.completed)) return session;
  const candidate = exerciseId === CONVENTIONAL_DEADLIFT_ID
    ? completeDeadliftPlan(exercise, session.deload)
    : { ...exercise, sets: exercise.sets.map((set) => ({ ...set, completed: true })) };
  if (!candidate || performedExercise(candidate, "exercise-summary-v1").kind === "unavailable") return session;
  const exercises = session.exercises.map((item) => item.id === exerciseId ? candidate : item);
  const currentIndex = exercises.findIndex((item) => item.id === exerciseId);
  const next = [...exercises.slice(currentIndex + 1), ...exercises.slice(0, currentIndex)]
    .find((item) => !item.sets.length || item.sets.some((set) => !set.completed));
  return { ...session, focusedExerciseId: next?.id, exercises };
}

function completeDeadliftPlan(exercise: Exercise, deload?: boolean): Exercise | undefined {
  const inputs = exercise.deadliftCalculator;
  const plan = calculateDeadliftPlan(inputs?.schemeId, inputs?.referenceTripleKg, deload);
  if (!plan) return undefined;
  const sets = plan.workingSets.map((set) => ({ ...set, completed: true }));
  const reps = sets.map((set) => set.reps);
  const completed: Exercise = {
    ...exercise,
    deadliftPlanLogged: true,
    targetSets: sets.length,
    workingSetCount: sets.length,
    repRange: [Math.min(...reps), Math.max(...reps)],
    sets,
  };
  const best = bestCompletedWorkingSet(completed);
  return best ? { ...completed, lastWeight: best.weight, lastReps: best.reps } : undefined;
}

export function summaryExerciseSetCount(exercise: Exercise): number {
  if (!exercise.deadliftCalculator || exercise.sets.some((set) => set.completed)) return exercise.sets.length;
  const { schemeId, referenceTripleKg } = exercise.deadliftCalculator;
  return calculateDeadliftPlan(schemeId, referenceTripleKg)?.workingSets.length ?? exercise.sets.length;
}

export function reopenExerciseSummary(session: ActiveSession, exerciseId: string): ActiveSession {
  if (session.exerciseLogFormat !== "exercise-summary-v1") return session;
  const exercise = session.exercises.find((item) => item.id === exerciseId);
  if (!exercise || !exercise.sets.some((set) => set.completed)) return session;
  return {
    ...session,
    focusedExerciseId: exerciseId,
    exercises: session.exercises.map((item) => item.id === exerciseId ? { ...item, sets: item.sets.map((set) => ({ ...set, completed: false })) } : item),
  };
}

export function isExerciseSummarySessionComplete(session: ActiveSession): boolean {
  return session.exerciseLogFormat === "exercise-summary-v1"
    && session.exercises.every((exercise) => exercise.sets.length > 0
      && exercise.sets.every((set) => set.completed)
      && performedExercise(exercise, "exercise-summary-v1").kind !== "unavailable");
}

function latestSummarySeed(records: SessionRecord[], exerciseId: string, prescription?: Exercise): { workingWeight: number; workingSetCount: number } | undefined {
  return [...records]
    .filter((record) => !record.deload)
    .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime())
    .flatMap((record) => {
      const exercise = record.exercises.find((item) => item.id === exerciseId);
      if (!exercise) return [];
      const format = record.exerciseLogFormat ?? "legacy-set-v1";
      const performed = performedExercise(exercise, format);
      if (prescription) {
        const [minReps, maxReps] = prescription.repRange;
        const plannedCount = format === "exercise-summary-v1" ? exercise.targetSets : exercise.workingSetCount ?? workingSets(exercise).length;
        if (plannedCount !== prescription.targetSets || exercise.repRange[0] !== minReps || exercise.repRange[1] !== maxReps) return [];
        if (performed.kind === "summary") {
          const reps = performed.representativeReps;
          return performed.workingWeight >= DEADLIFT_BAR_KG && (reps === null || (reps >= minReps && reps <= maxReps))
            ? [{ workingWeight: performed.workingWeight, workingSetCount: performed.workingSetCount }]
            : [];
        }
        if (performed.kind === "legacy-sets" || performed.kind === "working-sets") {
          const { weight } = performed.sets[0];
          if (weight < DEADLIFT_BAR_KG || !performed.sets.every((set) => set.weight === weight && set.reps >= minReps && set.reps <= maxReps)) return [];
        }
      }
      if (performed.kind === "summary") return [{ workingWeight: performed.workingWeight, workingSetCount: performed.workingSetCount }];
      if (performed.kind === "legacy-sets" || performed.kind === "working-sets") {
        return [{
          workingWeight: performed.sets.reduce((maximum, set) => Math.max(maximum, set.weight), 0),
          workingSetCount: performed.sets.length,
        }];
      }
      return [];
    })[0];
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
  if (exercise.deadliftPlanLogged) return 0;
  if (isThreeByThreeExercise(exercise)) return Math.max(0, exercise.sets.length - calculatorWorkingSetCount(exercise));
  return Math.max(0, exercise.sets.length - 2);
}

export function isWorkingSet(exercise: Exercise, setIndex: number): boolean {
  return setIndex >= workingSetStartIndex(exercise);
}

export function workingSets(exercise: Exercise): SetLog[] {
  return exercise.sets.slice(workingSetStartIndex(exercise));
}

export function performedExercise(exercise: Exercise, format: ExerciseLogFormat): PerformedExercise {
  if (format === "legacy-set-v1") {
    const startIndex = workingSetStartIndex(exercise);
    const sets = workingSets(exercise).filter((set, index): set is TrackedSetLog =>
      set.completed && hasTrackedReps(set) && !setValidationError(set, exercise, startIndex + index));
    if (!sets.length) return { kind: "unavailable", reason: "no-completed-sets" };
    return { kind: "legacy-sets", sets, volume: sets.reduce((sum, set) => sum + set.weight * set.reps, 0) };
  }

  const sets = exercise.sets.filter((set) => set.completed);
  if (!sets.length) return { kind: "unavailable", reason: "no-completed-sets" };
  if (exercise.id === CONVENTIONAL_DEADLIFT_ID && exercise.deadliftPlanLogged) {
    const valid = sets.every((set): set is TrackedSetLog => isDeadliftWorkingWeight(set.weight)
      && hasTrackedReps(set) && Number.isInteger(set.reps) && set.reps >= 1 && set.reps <= MAX_DEADLIFT_PLANNED_REPS);
    if (!valid || sets.length > 20) return { kind: "unavailable", reason: "inconsistent-summary" };
    return { kind: "working-sets", sets, volume: sets.reduce((sum, set) => sum + set.weight * set.reps, 0) };
  }
  const first = sets[0];
  const validWeight = Number.isFinite(first.weight) && first.weight >= 0 && first.weight <= 2_000;
  const validReps = first.reps === null || (Number.isInteger(first.reps) && first.reps >= 1 && first.reps <= 100);
  const consistent = sets.every((set) => set.weight === first.weight && set.reps === first.reps);
  if (!validWeight || !validReps || !consistent || sets.length > 20) return { kind: "unavailable", reason: "inconsistent-summary" };
  return { kind: "summary", workingWeight: first.weight, workingSetCount: sets.length, representativeReps: first.reps };
}

export function bestCompletedWorkingSet(exercise: Exercise): TrackedSetLog | undefined {
  return workingSets(exercise)
    .filter((set, index): set is TrackedSetLog => set.completed && hasTrackedReps(set) && !setValidationError(set, exercise, workingSetStartIndex(exercise) + index))
    .reduce<TrackedSetLog | undefined>((best, set) => !best || set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps) ? set : best, undefined);
}

export function applyWarmupLoads(exercise: Exercise, workingWeight = exercise.lastWeight): Exercise {
  if (isThreeByThreeExercise(exercise)) {
    const workingStart = workingSetStartIndex(exercise);
    const existingWorkingSets = exercise.sets.slice(workingStart);
    const rampLoads = calculatedDeadliftRamp(workingWeight);
    const warmups = calculatedBarbellWarmups(rampLoads[0] ?? workingWeight);
    const sets = [
      ...warmups.map((set, index) => ({ ...set, completed: exercise.sets[index]?.completed ?? false })),
      ...rampLoads.map((weight, index) => ({
        ...(existingWorkingSets[index] ?? { reps: Math.max(3, exercise.repRange[0]), completed: false }),
        weight,
        reps: 3,
      })),
    ];
    return {
      ...exercise,
      targetSets: sets.length,
      workingSetCount: DEADLIFT_RAMP_PERCENTAGES.length,
      repRange: [3, 3],
      lastReps: 3,
      sets,
    };
  }
  const warmupCount = workingSetStartIndex(exercise);
  return {
    ...exercise,
    sets: exercise.sets.map((set, index) => {
      const scale = warmupCount === 2 && index === 0 ? 0.5 : index < warmupCount ? 0.7 : 1;
      return { ...set, weight: roundExerciseLoad(workingWeight * scale, exercise), completed: false };
    }),
  };
}

export function applyWorkingLoadPreservingWarmups(exercise: Exercise, workingWeight: number): Exercise {
  if (isThreeByThreeExercise(exercise)) {
    return applyWarmupLoads({ ...exercise, lastWeight: workingWeight, lastReps: 3 }, workingWeight);
  }
  const workingStart = workingSetStartIndex(exercise);
  return {
    ...exercise,
    lastWeight: workingWeight,
    lastReps: isThreeByThreeExercise(exercise) ? 3 : exercise.lastReps,
    sets: exercise.sets.map((set, index) => index < workingStart ? set : {
      ...set,
      weight: workingWeight,
      reps: isThreeByThreeExercise(exercise) ? 3 : set.reps,
      completed: false,
    }),
  };
}

export function updateExerciseSet(exercise: Exercise, setIndex: number, changes: Partial<SetLog>): Exercise {
  const sets = exercise.sets.map((set, index) => index === setIndex ? { ...set, ...changes } : set);
  return { ...exercise, sets };
}

function roundThreeByThreeLoad(weight: number): number {
  return Math.max(20, Math.round(weight / 2.5) * 2.5);
}

function calculatorWorkingSetCount(exercise: Exercise): number {
  return isThreeByThreeExercise(exercise) ? DEADLIFT_RAMP_PERCENTAGES.length : Math.max(1, Math.min(5, exercise.targetSets));
}

function calculatedDeadliftRamp(conqueredTriple: number): number[] {
  if (conqueredTriple <= 0) return DEADLIFT_RAMP_PERCENTAGES.map(() => 0);
  return DEADLIFT_RAMP_PERCENTAGES.map((percentage, index) => index === DEADLIFT_RAMP_PERCENTAGES.length - 1
    ? conqueredTriple
    : Math.min(conqueredTriple, roundThreeByThreeLoad(conqueredTriple * percentage)));
}

function calculatedBarbellWarmups(workingWeight: number): SetLog[] {
  if (workingWeight <= 20) return [];
  const scales = workingWeight <= 40 ? [20 / workingWeight]
    : workingWeight <= 80 ? [20 / workingWeight, 0.7]
      : workingWeight <= 120 ? [20 / workingWeight, 0.55, 0.8]
        : [20 / workingWeight, 0.4, 0.6, 0.8];
  const weights = scales
    .map((scale) => roundThreeByThreeLoad(workingWeight * scale))
    .filter((weight, index, values) => weight < workingWeight && values.indexOf(weight) === index);
  return weights.map((weight, index) => ({ weight, reps: index === 0 ? 5 : 3, completed: false }));
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
      if (isThreeByThreeExercise(exercise)) {
        const workingStart = workingSetStartIndex(exercise);
        const workingSetCount = Math.max(1, calculatorWorkingSetCount(exercise) - adjustment.setReduction);
        return applyWarmupLoads({
          ...exercise,
          targetSets: workingSetCount,
          workingSetCount,
          sets: exercise.sets.slice(workingStart, workingStart + workingSetCount),
        }, roundExerciseLoad(exercise.lastWeight * adjustment.loadScale, exercise));
      }
      const targetSets = Math.max(2, Math.min(5, exercise.targetSets - adjustment.setReduction));
      return applyWarmupLoads({
        ...exercise,
        targetSets,
        sets: exercise.sets.slice(0, targetSets),
      }, roundExerciseLoad(exercise.lastWeight * adjustment.loadScale, exercise));
    }),
  };
}

export function completeActiveSession(session: ActiveSession, now = new Date()): SessionRecord {
  const summaryFormat = session.exerciseLogFormat === "exercise-summary-v1";
  const hasUntrackedCompletedReps = summaryFormat && session.exercises.some((exercise) => exercise.sets.some((set) => set.completed && set.reps === null));
  const summaryVolume = summaryFormat ? session.exercises.reduce((total, exercise) => {
    const performed = performedExercise(exercise, "exercise-summary-v1");
    if (performed.kind === "working-sets") return total + performed.volume;
    return performed.kind === "summary" && performed.representativeReps !== null
      ? total + performed.workingWeight * performed.workingSetCount * performed.representativeReps
      : total;
  }, 0) : 0;
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
    exerciseLogFormat: session.exerciseLogFormat ?? "legacy-set-v1",
    exercises: session.exercises.map((exercise) => {
      if (summaryFormat) {
        const performed = performedExercise(exercise, "exercise-summary-v1");
        return {
          ...exercise,
          ...(exercise.deadliftCalculator && { deadliftCalculator: undefined }),
          lastWeight: performed.kind === "summary" ? performed.workingWeight : exercise.lastWeight,
          lastReps: performed.kind === "summary" && performed.representativeReps !== null ? performed.representativeReps : exercise.lastReps,
          sets: exercise.sets.map((set) => ({ weight: set.weight, reps: set.reps, completed: set.completed })),
        };
      }
      const best = bestCompletedWorkingSet(exercise);
      return {
        ...exercise,
        lastWeight: best?.weight ?? exercise.lastWeight,
        lastReps: best?.reps ?? exercise.lastReps,
        sets: exercise.sets.map((set, index) => ({ weight: set.weight, reps: set.reps, completed: set.completed && !setValidationError(set, exercise, index) })),
      };
    }),
    volume: hasUntrackedCompletedReps ? null : summaryFormat ? summaryVolume : sessionVolume(session.exercises),
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
    exerciseLogFormat: "legacy-set-v1",
    exercises: record.exercises.map((recordedExercise) => {
      const current = currentWorkouts.flatMap((workout) => workout.exercises).find((exercise) => exercise.id === recordedExercise.id);
      const latest = latestPerformedExercise(records, recordedExercise.id) ?? current ?? recordedExercise;
      const best = bestCompletedWorkingSet(latest);
      const workingWeight = best?.weight ?? latest.lastWeight ?? recordedExercise.lastWeight;
      const lastReps = best?.reps ?? latest.lastReps ?? recordedExercise.lastReps;
      const workingStart = workingSetStartIndex(recordedExercise);
      const sets = isThreeByThreeExercise(recordedExercise)
        ? Array.from({ length: recordedExercise.sets.length }, (_, index) => ({
          weight: index < workingStart ? latest.sets[index]?.weight ?? recordedExercise.sets[index]?.weight ?? workingWeight : workingWeight,
          reps: recordedExercise.sets[index]?.reps || recordedExercise.repRange[0],
          completed: false,
        }))
        : Array.from({ length: latest.sets.length }, (_, index) => ({
          ...(latest.sets[index] ?? recordedExercise.sets[index]),
          completed: false,
        }));
      return normalizeLegacyExercisePrescription({
        ...recordedExercise,
        loadingType: current?.loadingType ?? latest.loadingType ?? recordedExercise.loadingType,
        loadIncrement: current?.loadIncrement ?? latest.loadIncrement ?? recordedExercise.loadIncrement,
        restSeconds: current?.restSeconds ?? latest.restSeconds ?? recordedExercise.restSeconds,
        lastWeight: workingWeight,
        lastReps,
        targetSets: sets.length,
        workingSetCount: recordedExercise.workingSetCount ?? latest.workingSetCount,
        sets,
      });
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
  if (session.deload) {
    const source = workouts.find((workout) => workout.id === session.workoutId);
    const changedPrescription = source?.exercises.some((exercise) => {
      const performed = session.exercises.find((item) => item.id === exercise.id);
      if (!performed || performed.targetSets !== exercise.targetSets) return true;
      const expectedDeload = applyWarmupLoads(exercise, roundExerciseLoad(exercise.lastWeight * 0.75, exercise));
      return performed.sets.slice(0, workingSetStartIndex(performed)).some((set, index) => set.weight !== expectedDeload.sets[index]?.weight);
    });
    if (!changedPrescription) return workouts;
  }
  return workouts.map((workout) => workout.id !== session.workoutId ? workout : {
    ...workout,
    exercises: workout.exercises.map((exercise) => {
      const performed = session.exercises.find((item) => item.id === exercise.id);
      if (!performed) return exercise;
      if (session.exerciseLogFormat === "exercise-summary-v1") {
        const summary = performedExercise(performed, "exercise-summary-v1");
        if (exercise.id === CONVENTIONAL_DEADLIFT_ID) {
          if (session.deload) return exercise;
          if (summary.kind === "working-sets") return normalizeExercisePrescription({
            ...exercise, lastWeight: performed.lastWeight, lastReps: performed.lastReps,
          });
          if (summary.kind === "summary") return normalizeExercisePrescription({
            ...exercise, lastWeight: summary.workingWeight, lastReps: summary.representativeReps ?? exercise.lastReps,
          });
          return exercise;
        }
        if (summary.kind !== "summary") return exercise;
        const targetSets = Math.max(2, Math.min(5, summary.workingSetCount));
        return applyWarmupLoads(normalizeExercisePrescription({
          ...exercise,
          lastWeight: summary.workingWeight,
          lastReps: summary.representativeReps ?? exercise.lastReps,
          targetSets,
          workingSetCount: targetSets,
          sets: Array.from({ length: targetSets }, (_, index) => ({
            ...(exercise.sets[index] ?? exercise.sets.at(-1) ?? { reps: exercise.lastReps }),
            weight: summary.workingWeight,
            completed: false,
          })),
        }), summary.workingWeight);
      }
      if (isThreeByThreeExercise(performed)) {
        const best = bestCompletedWorkingSet(performed);
        return session.deload || !best ? exercise : normalizeExercisePrescription({
          ...exercise, lastWeight: best.weight, lastReps: best.reps,
        });
      }
      const resized = {
        ...exercise,
        supersetId: performed.supersetId,
        targetSets: performed.targetSets,
        workingSetCount: performed.workingSetCount,
        sets: Array.from({ length: performed.targetSets }, (_, index) => ({
          ...(exercise.sets[index] ?? exercise.sets.at(-1) ?? performed.sets[index]),
          completed: false,
        })),
      };
      const preservePerformedWarmups = (workingWeight: number, lastReps = exercise.lastReps): Exercise => {
        const workingStart = workingSetStartIndex(performed);
        return {
          ...resized,
          lastWeight: workingWeight,
          lastReps,
          sets: performed.sets.map((set, index) => ({
            ...set,
            weight: index < workingStart ? set.weight : workingWeight,
            completed: false,
          })),
        };
      };
      if (session.deload) {
        const expectedDeload = applyWarmupLoads(exercise, roundExerciseLoad(exercise.lastWeight * 0.75, exercise));
        return performed.targetSets === exercise.targetSets && performed.sets.slice(0, workingSetStartIndex(performed)).every((set, index) => set.weight === expectedDeload.sets[index]?.weight) ? exercise : preservePerformedWarmups(exercise.lastWeight);
      }
      const best = bestCompletedWorkingSet(performed);
      if (!best) return preservePerformedWarmups(exercise.lastWeight);
      return {
        ...resized,
        lastWeight: best.weight,
        lastReps: best.reps,
        sets: performed.sets.map((set) => ({ ...set, completed: false })),
      };
    }),
  });
}

export type WorkoutEditingContext = {
  knownExercises?: Exercise[];
  records?: SessionRecord[];
};

function knownExercisePerformance(exerciseId: string, context: WorkoutEditingContext): { known?: Exercise; historical?: { exercise: Exercise; best: TrackedSetLog } } {
  const known = context.knownExercises?.find((exercise) => exercise.id === exerciseId);
  const historical = (context.records ?? [])
    .flatMap((record) => record.exercises)
    .filter((exercise) => exercise.id === exerciseId)
    .map((exercise) => ({ exercise, best: bestCompletedWorkingSet(exercise) }))
    .filter((item): item is { exercise: Exercise; best: TrackedSetLog } => Boolean(item.best))
    .reduce<{ exercise: Exercise; best: TrackedSetLog } | undefined>((best, item) => !best || item.best.weight > best.best.weight || (item.best.weight === best.best.weight && item.best.reps > best.best.reps) ? item : best, undefined);
  return { known, historical };
}

export function replaceExerciseInWorkoutDraft(workout: Workout, exerciseId: string, replacement: { id: string; name: string }, context: WorkoutEditingContext = {}): Workout {
  const source = workout.exercises.find((exercise) => exercise.id === exerciseId);
  if (!source || source.id === replacement.id || workout.exercises.some((exercise) => exercise.id !== exerciseId && exercise.id === replacement.id)) return workout;
  const { known, historical } = knownExercisePerformance(replacement.id, context);
  const bestWeight = Math.max(known?.lastWeight ?? 0, historical?.best.weight ?? 0);
  const bestReps = historical?.best.weight === bestWeight ? historical.best.reps : known?.lastReps;
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => exercise.id !== exerciseId ? exercise : prepareDraftExercise({
      ...exercise,
      id: replacement.id,
      name: replacement.name,
      loadingType: known?.loadingType ?? historical?.exercise.loadingType,
      deadliftCalculator: undefined,
      deadliftPlanLogged: undefined,
      lastWeight: bestWeight,
      lastReps: bestReps ?? exercise.repRange[0],
      sets: Array.from({ length: exercise.targetSets }, () => ({ weight: bestWeight, reps: bestReps ?? exercise.repRange[0], completed: false })),
    })),
  };
}

export function addExerciseToWorkoutDraft(workout: Workout, definition: { id: string; name: string; modality: "compound" | "isolation"; defaultRepRanges: { hypertrophy: [number, number] } }, context: WorkoutEditingContext = {}): Workout {
  if (workout.exercises.some((exercise) => exercise.id === definition.id)) return workout;
  const { known, historical } = knownExercisePerformance(definition.id, context);
  const workingWeight = Math.max(known?.lastWeight ?? 0, historical?.best.weight ?? 0);
  const lastReps = historical?.best.weight === workingWeight ? historical.best.reps : known?.lastReps ?? definition.defaultRepRanges.hypertrophy[0];
  const targetSets = definition.modality === "isolation" ? 3 : 4;
  const added = prepareDraftExercise({
    id: definition.id,
    name: definition.name,
    targetSets,
    repRange: definition.defaultRepRanges.hypertrophy,
    lastWeight: workingWeight,
    lastReps,
    loadingType: known?.loadingType ?? historical?.exercise.loadingType,
    loadIncrement: known?.loadIncrement ?? historical?.exercise.loadIncrement,
    restSeconds: known?.restSeconds ?? historical?.exercise.restSeconds ?? 90,
    sets: Array.from({ length: targetSets }, () => ({ weight: workingWeight, reps: lastReps, completed: false })),
  });
  return { ...workout, exercises: [...workout.exercises, added] };
}

function prepareDraftExercise(exercise: Exercise): Exercise {
  const normalized = normalizeExercisePrescription(exercise);
  return exercise.id === CONVENTIONAL_DEADLIFT_ID ? normalized : applyWarmupLoads(normalized);
}

export function removeExerciseFromWorkoutDraft(workout: Workout, exerciseId: string): Workout {
  if (workout.exercises.length <= 1 || !workout.exercises.some((exercise) => exercise.id === exerciseId)) return workout;
  return {
    ...workout,
    exercises: normalizeSupersetPairs(workout.exercises.filter((exercise) => exercise.id !== exerciseId)),
  };
}

export function replaceWorkoutExercise(workouts: Workout[], workoutId: string, exerciseId: string, replacement: { id: string; name: string }, records: SessionRecord[] = []): Workout[] {
  const knownExercises = workouts.flatMap((workout) => workout.exercises);
  return workouts.map((workout) => workout.id === workoutId ? replaceExerciseInWorkoutDraft(workout, exerciseId, replacement, { knownExercises, records }) : workout);
}

export function addWorkoutExercise(workouts: Workout[], workoutId: string, definition: { id: string; name: string; modality: "compound" | "isolation"; defaultRepRanges: { hypertrophy: [number, number] } }, records: SessionRecord[] = []): Workout[] {
  const knownExercises = workouts.flatMap((workout) => workout.exercises);
  return workouts.map((workout) => workout.id === workoutId ? addExerciseToWorkoutDraft(workout, definition, { knownExercises, records }) : workout);
}

export function removeWorkoutExercise(workouts: Workout[], workoutId: string, exerciseId: string): Workout[] {
  if (!workouts.some((workout) => workout.id === workoutId && workout.exercises.length > 1 && workout.exercises.some((exercise) => exercise.id === exerciseId))) return workouts;
  return workouts.map((workout) => workout.id === workoutId ? removeExerciseFromWorkoutDraft(workout, exerciseId) : workout);
}

export type RoutineEdit =
  | { type: "add"; exercise: ExerciseDefinition }
  | { type: "deadlift-prescription"; exerciseId: string; targetSets?: number; repRange?: [number, number] }
  | { type: "replace"; exerciseId: string; exercise: ExerciseDefinition }
  | { type: "remove"; exerciseId: string }
  | { type: "reorder"; exerciseId: string; targetExerciseId: string }
  | { type: "move"; exerciseId: string; direction: -1 | 1 };

export function editWorkoutRoutine(workouts: Workout[], workoutId: string, edit: RoutineEdit, records: SessionRecord[]): Workout[] {
  switch (edit.type) {
    case "add":
      return addWorkoutExercise(workouts, workoutId, edit.exercise, records);
    case "deadlift-prescription":
      return workouts.map((workout) => workout.id !== workoutId ? workout : {
        ...workout,
        exercises: workout.exercises.map((exercise) => exercise.id === CONVENTIONAL_DEADLIFT_ID && exercise.id === edit.exerciseId
          ? updateExercisePrescription(exercise, { targetSets: edit.targetSets, repRange: edit.repRange })
          : exercise),
      });
    case "replace":
      return replaceWorkoutExercise(workouts, workoutId, edit.exerciseId, edit.exercise, records);
    case "remove":
      return removeWorkoutExercise(workouts, workoutId, edit.exerciseId);
    case "move":
      return workouts.map((workout) => workout.id === workoutId ? moveWorkoutExercise(workout, edit.exerciseId, edit.direction) : workout);
    case "reorder":
      return workouts.map((workout) => workout.id === workoutId ? reorderWorkoutExercise(workout, edit.exerciseId, edit.targetExerciseId) : workout);
  }
}

export function progression(exercise: Exercise, unit: WeightUnit = "kg"): string {
  const completed = workingSets(exercise).filter((set): set is TrackedSetLog => set.completed && hasTrackedReps(set));
  const best = bestCompletedWorkingSet(exercise);
  if (isThreeByThreeExercise(exercise)) return best && best.reps >= 3 ? `Triple conquered at ${displayWeight(best.weight, unit)} ${weightUnitLabel(unit)} total · ${displayExerciseWeight(best.weight, exercise, unit)} ${exerciseWeightLabel(exercise, unit)}. Increase conservatively next time.` : "Complete at least one working set of 3 to conquer this target";
  const requiredSets = exercise.programmedWorkingSets ? exercise.targetSets : Math.min(2, exercise.sets.length);
  if (completed.length === requiredSets && completed.every((set) => set.reps >= exercise.repRange[1]) && best) return `Ready to increase: try ${displayExerciseWeight(best.weight + loadIncrement({ ...exercise, lastWeight: best.weight }), exercise, unit)} ${exerciseWeightLabel(exercise, unit)} next time`;
  return `Progress when all ${requiredSets} working sets reach ${exercise.repRange[1]} reps`;
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

export function displayExerciseWeight(weightKg: number, exercise: Pick<Exercise, "loadingType"> & Partial<Pick<Exercise, "id">>, unit: WeightUnit): number {
  if (exercise.id && isThreeByThreeExercise({ id: exercise.id })) return Math.max(0, Math.round(((weightKg - 20) / 2) * 100) / 100);
  if (!exercise.loadingType) return displayWeight(weightKg, unit);
  const perSideKg = weightKg / 2;
  return unit === "kg" ? Math.round(perSideKg * 100) / 100 : displayWeight(perSideKg, unit);
}

export function storedExerciseWeight(displayedWeight: number, exercise: Pick<Exercise, "loadingType"> & Partial<Pick<Exercise, "id">>, unit: WeightUnit): number {
  if (exercise.id && isThreeByThreeExercise({ id: exercise.id })) return Math.max(20, storedWeight(displayedWeight, "kg") * 2 + 20);
  const weightKg = storedWeight(displayedWeight, unit);
  return exercise.loadingType ? weightKg * 2 : weightKg;
}

export function exerciseWeightLabel(exercise: Pick<Exercise, "loadingType"> & Partial<Pick<Exercise, "id">>, unit: WeightUnit): string {
  if (exercise.id && isThreeByThreeExercise({ id: exercise.id })) return "kg/side";
  return exercise.loadingType ? `${weightUnitLabel(unit)}/side` : weightUnitLabel(unit);
}

export function weightUnitLabel(unit: WeightUnit): string {
  return unit === "lb" ? "lb" : "kg";
}

export function updateExercisePrescription(exercise: Exercise, changes: { name?: string; targetSets?: number; repRange?: [number, number]; loadIncrement?: number; restSeconds?: number }): Exercise {
  if (exercise.id === CONVENTIONAL_DEADLIFT_ID) return normalizeExercisePrescription({
    ...exercise,
    targetSets: changes.targetSets ?? exercise.targetSets,
    repRange: changes.repRange ?? exercise.repRange,
  });
  const targetSets = Math.max(2, Math.min(5, changes.targetSets ?? exercise.targetSets));
  const repRange = changes.repRange ?? exercise.repRange;
  const minimumAllowedReps = exercise.programmedWorkingSets ? 3 : 6;
  const sets = Array.from({ length: targetSets }, (_, index) => exercise.sets[index] ?? {
    weight: exercise.lastWeight,
    reps: repRange[0],
    completed: false,
  });
  return normalizeExercisePrescription({
    ...exercise,
    ...changes,
    targetSets,
    repRange: [Math.max(minimumAllowedReps, repRange[0]), Math.max(repRange[0], repRange[1])],
    sets,
  });
}

export function resizeActiveExerciseSets(exercise: Exercise, targetSets: number): Exercise {
  if (isThreeByThreeExercise(exercise)) return exercise;
  const nextTarget = Math.max(2, Math.min(5, targetSets));
  const source = exercise.sets[exercise.sets.length - 1] ?? { weight: exercise.lastWeight, reps: exercise.repRange[0], completed: false };
  const sets = Array.from({ length: nextTarget }, (_, index) => exercise.sets[index] ?? { ...source, completed: false });
  return { ...exercise, targetSets: nextTarget, sets };
}

export function normalizeLegacyExercisePrescription(exercise: Exercise): Exercise {
  if (isThreeByThreeExercise(exercise)) {
    const workingCount = calculatorWorkingSetCount(exercise);
    const workingStart = workingSetStartIndex(exercise);
    const workingSets = Array.from({ length: workingCount }, (_, index) => {
      const source = exercise.sets[workingStart + index] ?? exercise.sets.at(-1) ?? { weight: exercise.lastWeight, reps: 3, completed: false };
      return { ...source, reps: Math.max(3, source.reps ?? 3) };
    });
    return applyWarmupLoads({
      ...exercise,
      targetSets: workingCount,
      workingSetCount: workingCount,
      repRange: [3, Math.max(3, exercise.repRange[1])],
      lastReps: 3,
      sets: workingSets,
    }, exercise.lastWeight);
  }
  return normalizeExercisePrescription(exercise);
}

export function normalizeExercisePrescription(exercise: Exercise): Exercise {
  if (exercise.id === CONVENTIONAL_DEADLIFT_ID) {
    const targetSets = Math.max(1, Math.min(20, Math.round(exercise.targetSets)));
    const minimumReps = Math.max(1, Math.min(MAX_DEADLIFT_PLANNED_REPS, Math.round(exercise.repRange[0])));
    const maximumReps = Math.max(minimumReps, Math.min(MAX_DEADLIFT_PLANNED_REPS, Math.round(exercise.repRange[1])));
    return {
      ...exercise,
      targetSets,
      workingSetCount: undefined,
      ...(exercise.deadliftPlanLogged && { deadliftPlanLogged: undefined }),
      repRange: [minimumReps, maximumReps],
      sets: Array.from({ length: targetSets }, () => ({ weight: exercise.lastWeight, reps: minimumReps, completed: false })),
    };
  }
  const modality = getExerciseDefinition(exercise.id)?.modality;
  const maximumReps = modality === "compound" ? (exercise.programmedWorkingSets ? 12 : 10) : modality === "isolation" ? 20 : 12;
  const minimumAllowedReps = exercise.programmedWorkingSets ? 3 : 6;
  const minimumReps = Math.min(maximumReps, Math.max(minimumAllowedReps, exercise.repRange[0]));
  const targetSets = Math.max(2, Math.min(5, exercise.targetSets));
  const repRange: [number, number] = [minimumReps, Math.min(maximumReps, Math.max(minimumReps, exercise.repRange[1]))];
  return {
    ...exercise,
    name: canonicalExerciseName(exercise),
    targetSets,
    repRange,
    lastReps: Math.min(maximumReps, Math.max(minimumAllowedReps, exercise.lastReps)),
    sets: Array.from({ length: targetSets }, (_, index) => {
      const source = exercise.sets[index] ?? exercise.sets.at(-1) ?? { weight: exercise.lastWeight, reps: minimumReps, completed: false };
      return { ...source, reps: Math.min(maximumReps, Math.max(minimumAllowedReps, source.reps ?? minimumReps)) };
    }),
  };
}

export function workoutExerciseBlocks(exercises: Exercise[]): Exercise[][] {
  return exercises.reduce<Exercise[][]>((result, exercise) => {
    const previous = result.at(-1);
    if (exercise.supersetId && previous?.[0].supersetId === exercise.supersetId) previous.push(exercise);
    else result.push([exercise]);
    return result;
  }, []);
}

export function moveWorkoutExercise(workout: Workout, exerciseId: string, direction: -1 | 1): Workout {
  const blocks = workoutExerciseBlocks(workout.exercises);
  const index = blocks.findIndex((block) => block.some((exercise) => exercise.id === exerciseId));
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= blocks.length) return workout;
  const reordered = [...blocks];
  [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
  return { ...workout, exercises: reordered.flat() };
}

function reorderWorkoutExercise(workout: Workout, exerciseId: string, targetExerciseId: string): Workout {
  const blocks = workoutExerciseBlocks(workout.exercises);
  const source = blocks.findIndex((block) => block.some(({ id }) => id === exerciseId));
  const target = blocks.findIndex((block) => block.some(({ id }) => id === targetExerciseId));
  if (source < 0 || target < 0 || source === target) return workout;
  const [moving] = blocks.splice(source, 1);
  blocks.splice(target, 0, moving);
  return { ...workout, exercises: blocks.flat() };
}

export function toggleWorkoutSuperset(workout: Workout, exerciseId: string): Workout {
  const index = workout.exercises.findIndex((exercise) => exercise.id === exerciseId);
  if (index < 0) return workout;
  const selected = workout.exercises[index];
  if (selected.supersetId) {
    return {
      ...workout,
      exercises: workout.exercises.map((exercise) => exercise.supersetId === selected.supersetId ? { ...exercise, supersetId: undefined } : exercise),
    };
  }
  const partner = workout.exercises[index + 1];
  if (!partner) return workout;
  const replacedIds = new Set([selected.supersetId, partner.supersetId].filter((id): id is string => Boolean(id)));
  const supersetId = `superset-${selected.id}-${partner.id}`;
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => {
      if (exercise.id === selected.id || exercise.id === partner.id) return { ...exercise, supersetId };
      return exercise.supersetId && replacedIds.has(exercise.supersetId) ? { ...exercise, supersetId: undefined } : exercise;
    }),
  };
}

export function normalizeSupersetPairs(exercises: Exercise[]): Exercise[] {
  const members = new Map<string, number[]>();
  exercises.forEach((exercise, index) => {
    if (!exercise.supersetId) return;
    members.set(exercise.supersetId, [...(members.get(exercise.supersetId) ?? []), index]);
  });
  const validIds = new Set([...members.entries()]
    .filter(([, indexes]) => indexes.length === 2 && indexes[1] === indexes[0] + 1)
    .map(([id]) => id));
  return exercises.map((exercise) => exercise.supersetId && !validIds.has(exercise.supersetId) ? { ...exercise, supersetId: undefined } : exercise);
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
import { getExerciseDefinition } from "./exerciseLibrary";
