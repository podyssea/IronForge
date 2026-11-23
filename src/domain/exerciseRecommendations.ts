import { Equipment, EXERCISE_LIBRARY, ExerciseDefinition, getExerciseDefinition } from "./exerciseLibrary";

export type ExerciseCandidateMatch = "substitution" | "compatible" | "other";

export type ExerciseCandidate = {
  exercise: ExerciseDefinition;
  match: ExerciseCandidateMatch;
  preferred: boolean;
};

export type ExerciseCandidateQuery = {
  currentExerciseId?: string;
  workoutExerciseIds?: string[];
  availableEquipment?: Equipment[];
  preferredExerciseIds?: string[];
  excludedExerciseIds?: string[];
  search?: string;
};

const matchRank: Record<ExerciseCandidateMatch, number> = {
  substitution: 0,
  compatible: 1,
  other: 2,
};
const uniqueExerciseLibrary = [...new Map(EXERCISE_LIBRARY.map((exercise) => [exercise.id, exercise])).values()];

export function rankExerciseCandidates(query: ExerciseCandidateQuery): ExerciseCandidate[] {
  const current = query.currentExerciseId ? getExerciseDefinition(query.currentExerciseId) : undefined;
  const availableEquipment = query.availableEquipment ? new Set(query.availableEquipment) : undefined;
  const excluded = new Set([
    ...(query.workoutExerciseIds ?? []),
    ...(query.excludedExerciseIds ?? []),
    ...(query.currentExerciseId ? [query.currentExerciseId] : []),
  ]);
  const preferred = new Set(query.preferredExerciseIds ?? []);
  const substitutions = new Set(current?.substitutions ?? []);
  const search = normalized(query.search ?? "");

  return uniqueExerciseLibrary
    .filter((exercise) => !excluded.has(exercise.id))
    .filter((exercise) => !availableEquipment || exercise.equipment.some((equipment) => availableEquipment.has(equipment)))
    .filter((exercise) => !search || searchableMetadata(exercise).includes(search))
    .map((exercise): ExerciseCandidate => ({
      exercise,
      match: candidateMatch(exercise, current, substitutions),
      preferred: preferred.has(exercise.id),
    }))
    .sort((left, right) => matchRank[left.match] - matchRank[right.match]
      || Number(right.preferred) - Number(left.preferred)
      || left.exercise.name.localeCompare(right.exercise.name)
      || left.exercise.id.localeCompare(right.exercise.id));
}

function candidateMatch(exercise: ExerciseDefinition, current: ExerciseDefinition | undefined, substitutions: Set<string>): ExerciseCandidateMatch {
  if (substitutions.has(exercise.id)) return "substitution";
  if (current && exercise.movementPattern === current.movementPattern && exercise.primaryMuscles.some((muscle) => current.primaryMuscles.includes(muscle))) return "compatible";
  return "other";
}

function searchableMetadata(exercise: ExerciseDefinition): string {
  return normalized([
    exercise.name,
    exercise.id,
    exercise.movementPattern,
    ...exercise.primaryMuscles,
    ...exercise.secondaryMuscles,
    ...exercise.equipment,
  ].join(" "));
}

function normalized(value: string): string {
  return value.trim().toLowerCase().replaceAll("-", " ").replaceAll(/\s+/g, " ");
}
