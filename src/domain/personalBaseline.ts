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
