import { SessionRecord, Workout } from "./training";

type BaselineExercise = {
  id: string;
  name: string;
  weight: number;
  sets: number;
  repRange: [number, number];
};

const upperA: BaselineExercise[] = [
  { id: "incline-smith", name: "Incline Smith Press", weight: 90, sets: 4, repRange: [6, 8] },
  { id: "machine-chest", name: "Machine Chest Press", weight: 90, sets: 3, repRange: [8, 10] },
  { id: "pull-ups", name: "Weighted Pull-Ups", weight: 0, sets: 4, repRange: [6, 8] },
  { id: "tbar-row", name: "Chest-Supported T-Bar Row", weight: 60, sets: 3, repRange: [8, 10] },
  { id: "lateral-raise", name: "Cable Lateral Raise", weight: 5, sets: 3, repRange: [12, 15] },
  { id: "preacher-curl", name: "Unilateral Preacher Curl", weight: 40, sets: 4, repRange: [8, 10] },
  { id: "pushdown", name: "Cambered Bar Pushdown", weight: 55, sets: 4, repRange: [8, 10] },
];

const lowerA: BaselineExercise[] = [
  { id: "rdl", name: "Romanian Deadlift (RDL)", weight: 100, sets: 4, repRange: [6, 8] },
  { id: "seated-leg-curl", name: "Seated Leg Curl", weight: 85, sets: 4, repRange: [10, 12] },
  { id: "walking-lunges", name: "Walking Lunges", weight: 10, sets: 3, repRange: [10, 12] },
  { id: "leg-press", name: "Leg Press", weight: 145, sets: 3, repRange: [10, 12] },
  { id: "seated-calf", name: "Seated Calf Raise", weight: 70, sets: 4, repRange: [10, 15] },
  { id: "abductors", name: "Abductors Machine", weight: 85, sets: 3, repRange: [8, 12] },
];

const upperB: BaselineExercise[] = [
  { id: "incline-machine", name: "Incline Chest Press Machine", weight: 80, sets: 3, repRange: [10, 12] },
  { id: "pec-deck", name: "Pec Deck Fly", weight: 30, sets: 3, repRange: [12, 15] },
  { id: "pullover", name: "Lat Pullover", weight: 12, sets: 3, repRange: [10, 12] },
  { id: "single-arm-row", name: "Single Arm Row", weight: 10, sets: 3, repRange: [10, 12] },
  { id: "shoulder-press", name: "Shoulder Press", weight: 60, sets: 3, repRange: [8, 10] },
  { id: "rear-delt", name: "Rear Delt Fly", weight: 30, sets: 3, repRange: [12, 15] },
  { id: "hammer-curl", name: "Unilateral Hammer Curl", weight: 40, sets: 4, repRange: [10, 12] },
  { id: "overhead-extension", name: "Laying Overhead DB Extension", weight: 10, sets: 4, repRange: [10, 12] },
];

const lowerB: BaselineExercise[] = [
  { id: "hack-squat", name: "Hack Squat", weight: 120, sets: 4, repRange: [8, 10] },
  { id: "panatta", name: "Panatta Press", weight: 70, sets: 3, repRange: [8, 10] },
  { id: "leg-extension", name: "Leg Extension", weight: 30, sets: 3, repRange: [12, 15] },
  { id: "adductor", name: "Adductor Machine", weight: 85, sets: 3, repRange: [12, 15] },
  { id: "lying-curl", name: "Lying Leg Curl", weight: 40, sets: 3, repRange: [10, 12] },
  { id: "seated-calf", name: "Seated Calf Raise", weight: 70, sets: 4, repRange: [12, 15] },
];

const schedule = [
  { id: "upper-a", title: "Monday · Upper A", focus: "Steady progression · upper body", date: "2026-07-20", exercises: upperA },
  { id: "lower-a", title: "Tuesday · Lower A", focus: "Steady progression · lower body", date: "2026-07-21", exercises: lowerA },
  { id: "upper-b", title: "Thursday · Upper B", focus: "Steady progression · upper body", date: "2026-07-23", exercises: upperB },
  { id: "lower-b", title: "Friday · Lower B", focus: "Steady progression · lower body", date: "2026-07-24", exercises: lowerB },
];

export function personalBaselineWorkouts(): Workout[] {
  return schedule.map((item) => ({
    id: item.id,
    title: item.title,
    focus: item.focus,
    exercises: item.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      targetSets: exercise.sets,
      repRange: exercise.repRange,
      lastWeight: exercise.weight,
      lastReps: exercise.repRange[1],
      sets: Array.from({ length: exercise.sets }, () => ({ weight: exercise.weight, reps: exercise.repRange[1], completed: false })),
    })),
  }));
}

export function personalBaselineRecords(): SessionRecord[] {
  const workouts = personalBaselineWorkouts();
  return schedule.slice(0, 2).map((item, index) => {
    const exercises = workouts[index].exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set, completed: true })) }));
    return {
      id: `imported-${item.date}-${item.id}`,
      sourceWorkoutId: item.id,
      completedAt: `${item.date}T18:00:00.000Z`,
      notes: "Imported baseline from previous training app.",
      workoutTitle: item.title,
      exercises,
      volume: exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + set.weight * set.reps, 0), 0),
    };
  }).reverse();
}

type StrengthPrescription = {
  id: string;
  name: string;
  sets: number;
  reps: [number, number];
  rir: [number, number];
  rest: [number, number];
};

const strengthSchedule: Array<Omit<Workout, "exercises"> & { exercises: StrengthPrescription[] }> = [
  {
    id: "upper-a",
    title: "Day 1 · Upper: Horizontal Focus",
    focus: "Bench strength · horizontal pulling · chest and triceps",
    estimatedDurationMinutes: [65, 70],
    strengthPriority: "Bench press first, before other pressing",
    exercises: [
      { id: "barbell-bench", name: "Barbell Bench Press", sets: 4, reps: [3, 5], rir: [1, 2], rest: [180, 180] },
      { id: "tbar-row", name: "Chest-Supported Row", sets: 3, reps: [5, 8], rir: [1, 2], rest: [120, 120] },
      { id: "incline-dumbbell", name: "Incline Dumbbell Press", sets: 2, reps: [6, 10], rir: [1, 2], rest: [120, 120] },
      { id: "seated-cable-row", name: "Seated Cable Row", sets: 2, reps: [8, 12], rir: [1, 2], rest: [90, 90] },
      { id: "lateral-raise", name: "Cable Lateral Raise", sets: 3, reps: [12, 15], rir: [1, 1], rest: [60, 60] },
      { id: "rope-pushdown", name: "Rope Triceps Pushdown", sets: 2, reps: [10, 12], rir: [1, 1], rest: [60, 60] },
      { id: "ez-bar-curl", name: "EZ-Bar Curl", sets: 2, reps: [8, 12], rir: [1, 1], rest: [60, 60] },
    ],
  },
  {
    id: "lower-a",
    title: "Day 2 · Lower: Squat Focus",
    focus: "Squat strength · quadriceps · unilateral stability",
    estimatedDurationMinutes: [65, 75],
    strengthPriority: "Back squat depth and bracing; avoid technique-breaking grinders",
    exercises: [
      { id: "back-squat", name: "Barbell Back Squat", sets: 4, reps: [3, 5], rir: [1, 2], rest: [180, 240] },
      { id: "hack-squat", name: "Hack Squat", sets: 3, reps: [6, 10], rir: [1, 2], rest: [120, 120] },
      { id: "seated-leg-curl", name: "Seated Leg Curl", sets: 3, reps: [8, 12], rir: [1, 1], rest: [90, 90] },
      { id: "split-squat", name: "Bulgarian Split Squat", sets: 2, reps: [8, 8], rir: [2, 2], rest: [90, 90] },
      { id: "standing-calf", name: "Standing Calf Raise", sets: 3, reps: [8, 12], rir: [1, 1], rest: [60, 60] },
      { id: "cable-crunch", name: "Cable Crunch", sets: 3, reps: [10, 15], rir: [1, 1], rest: [60, 60] },
    ],
  },
  {
    id: "upper-b",
    title: "Day 3 · Upper: Vertical Focus",
    focus: "Overhead strength · weighted pull-ups · shoulders and lats",
    estimatedDurationMinutes: [65, 75],
    strengthPriority: "Overhead press and weighted pull-ups; alternate first movement by block",
    exercises: [
      { id: "overhead-press", name: "Barbell Overhead Press", sets: 4, reps: [3, 5], rir: [1, 2], rest: [180, 180] },
      { id: "pull-ups", name: "Weighted Pull-Ups", sets: 4, reps: [4, 6], rir: [1, 2], rest: [120, 180] },
      { id: "close-grip-bench", name: "Close-Grip Bench Press", sets: 3, reps: [6, 8], rir: [1, 2], rest: [120, 120] },
      { id: "lat-pulldown", name: "Neutral-Grip Lat Pulldown", sets: 2, reps: [8, 12], rir: [1, 1], rest: [90, 90] },
      { id: "lateral-raise", name: "Cable Lateral Raise", sets: 3, reps: [12, 20], rir: [1, 1], rest: [60, 60] },
      { id: "reverse-pec-deck", name: "Reverse Pec Deck", sets: 2, reps: [12, 15], rir: [1, 1], rest: [60, 60] },
      { id: "incline-dumbbell-curl", name: "Incline Dumbbell Curl", sets: 2, reps: [8, 12], rir: [1, 1], rest: [60, 60] },
    ],
  },
  {
    id: "lower-b",
    title: "Day 4 · Lower: Deadlift Focus",
    focus: "Deadlift strength · posterior chain · secondary quad development",
    exercises: [
      { id: "conventional-deadlift", name: "Conventional Deadlift", sets: 3, reps: [3, 5], rir: [2, 2], rest: [180, 240] },
      { id: "front-squat", name: "Front Squat", sets: 3, reps: [5, 8], rir: [2, 2], rest: [120, 180] },
      { id: "rdl", name: "Romanian Deadlift", sets: 2, reps: [6, 8], rir: [2, 2], rest: [120, 120] },
      { id: "lying-curl", name: "Lying Leg Curl", sets: 2, reps: [10, 12], rir: [1, 1], rest: [90, 90] },
      { id: "seated-calf", name: "Seated Calf Raise", sets: 3, reps: [10, 15], rir: [1, 1], rest: [60, 60] },
      { id: "hanging-leg-raise", name: "Hanging Leg Raise", sets: 3, reps: [10, 15], rir: [1, 1], rest: [60, 60] },
    ],
  },
];

export function strengthFocusedFourDaySplit(existing: Workout[] = [], records: SessionRecord[] = []): Workout[] {
  const current = new Map(existing.flatMap((workout) => workout.exercises.map((exercise) => [exercise.id, exercise] as const)));
  const historical = new Map<string, Workout["exercises"][number]>();
  [...records].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).forEach((record) => {
    record.exercises.forEach((exercise) => { if (!historical.has(exercise.id)) historical.set(exercise.id, exercise); });
  });

  return strengthSchedule.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((prescription) => {
      const known = current.get(prescription.id) ?? historical.get(prescription.id);
      const weight = known?.lastWeight ?? 0;
      const lastReps = Math.max(prescription.reps[0], Math.min(prescription.reps[1], known?.lastReps ?? prescription.reps[0]));
      return {
        id: prescription.id,
        name: prescription.name,
        targetSets: prescription.sets,
        repRange: prescription.reps,
        rirRange: prescription.rir,
        restSeconds: prescription.rest[0],
        restSecondsMax: prescription.rest[1],
        programmedWorkingSets: true,
        lastWeight: weight,
        lastReps,
        loadingType: known?.loadingType,
        loadIncrement: known?.loadIncrement,
        sets: Array.from({ length: prescription.sets }, () => ({ weight, reps: prescription.reps[0], completed: false })),
      };
    }),
  }));
}
