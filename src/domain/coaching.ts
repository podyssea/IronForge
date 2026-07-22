import { Equipment, ExperienceLevel, TrainingStyle } from "./exerciseLibrary";
import { Exercise, SessionRecord, Workout } from "./training";

export type CoachingProfile = {
  goal: TrainingStyle;
  experience: ExperienceLevel;
  sessionMinutes: number;
  availableEquipment: Equipment[];
  preferredExerciseIds: string[];
  excludedExerciseIds: string[];
};

export const DEFAULT_COACHING_PROFILE: CoachingProfile = {
  goal: "hypertrophy",
  experience: "intermediate",
  sessionMinutes: 60,
  availableEquipment: ["barbell", "dumbbell", "cable", "machine", "smith-machine", "bodyweight", "resistance-band", "kettlebell"],
  preferredExerciseIds: [],
  excludedExerciseIds: [],
};

export type CoachingRecommendation = {
  id: string;
  workoutId: string;
  exerciseId: string;
  exerciseName: string;
  action: "increase" | "hold" | "reduce";
  currentWeight: number;
  suggestedWeight: number;
  reason: string;
};

export type CoachingDecision = {
  recommendationId: string;
  decidedAt: string;
  outcome: "accepted" | "modified" | "rejected";
  selectedWeight: number;
};

export function buildWorkoutRecommendations(workout: Workout, records: SessionRecord[], decisions: CoachingDecision[]): CoachingRecommendation[] {
  const decided = new Set(decisions.map((decision) => decision.recommendationId));
  return workout.exercises.flatMap((exercise) => {
    const performances = records
      .filter((record) => record.sourceWorkoutId === workout.id && record.exercises.some((item) => item.id === exercise.id))
      .slice(0, 3)
      .map((record) => ({ record, exercise: record.exercises.find((item) => item.id === exercise.id) as Exercise }));
    if (!performances.length) return [];
    const recommendation = recommendExercise(workout.id, exercise, performances);
    return decided.has(recommendation.id) ? [] : [recommendation];
  });
}

function recommendExercise(workoutId: string, exercise: Exercise, performances: { record: SessionRecord; exercise: Exercise }[]): CoachingRecommendation {
  const latestRecord = performances[0].record;
  const recent = performances.slice(0, 2);
  const successful = recent.length === 2 && recent.every(({ exercise: performed }) => {
    const completed = performed.sets.filter((set) => set.completed);
    return completed.length >= exercise.targetSets && completed.every((set) => set.reps >= exercise.repRange[1]);
  });
  const repeatedlyIncomplete = recent.length === 2 && recent.every(({ exercise: performed }) => performed.sets.filter((set) => set.completed).length < exercise.targetSets);
  const plateau = performances.length === 3 && performances.every(({ exercise: performed }) => performed.lastWeight === performances[0].exercise.lastWeight)
    && averageReps(performances[0].exercise) <= averageReps(performances[2].exercise);
  const increment = exercise.lastWeight >= 50 ? 2.5 : 1;
  const reduction = Math.max(0, roundLoad(exercise.lastWeight * 0.9));
  const action: CoachingRecommendation["action"] = successful && exercise.lastWeight > 0 ? "increase" : repeatedlyIncomplete && exercise.lastWeight > 0 ? "reduce" : "hold";
  const suggestedWeight = action === "increase" ? exercise.lastWeight + increment : action === "reduce" ? reduction : exercise.lastWeight;
  const reason = action === "increase"
    ? `You reached ${exercise.repRange[1]}+ reps across every prescribed set in your last two sessions.`
    : action === "reduce"
      ? "You missed prescribed sets in your last two sessions. A small reset can rebuild momentum."
      : plateau
        ? "Your load and average reps have stalled across three sessions. Hold the load and aim to add a rep."
        : recent.length < 2
          ? "One performance is logged. Hold this load while the coach builds a reliable trend."
          : `Keep this load until every set reaches ${exercise.repRange[1]} reps.`;
  return {
    id: `${workoutId}:${exercise.id}:${latestRecord.id}`,
    workoutId,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    action,
    currentWeight: exercise.lastWeight,
    suggestedWeight,
    reason,
  };
}

function averageReps(exercise: Exercise): number {
  const completed = exercise.sets.filter((set) => set.completed);
  return completed.length ? completed.reduce((sum, set) => sum + set.reps, 0) / completed.length : 0;
}

function roundLoad(weight: number): number {
  return Math.round(weight * 2) / 2;
}

export function applyCoachingRecommendation(workouts: Workout[], recommendation: CoachingRecommendation, selectedWeight: number): Workout[] {
  const weight = Math.max(0, roundLoad(selectedWeight));
  return workouts.map((workout) => workout.id !== recommendation.workoutId ? workout : {
    ...workout,
    exercises: workout.exercises.map((exercise) => exercise.id !== recommendation.exerciseId ? exercise : {
      ...exercise,
      lastWeight: weight,
      sets: exercise.sets.map((set) => ({ ...set, weight })),
    }),
  });
}
