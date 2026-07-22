import { Exercise, SessionRecord, SetLog } from "./training";

export type ExerciseComparison = {
  exerciseId: string;
  previousFound: boolean;
  weightChange: number;
  repChange: number;
  volumeChange: number;
};

export function compareSessionExercises(record: SessionRecord, records: SessionRecord[]): Map<string, ExerciseComparison> {
  const recordIndex = records.findIndex((item) => item.id === record.id);
  const olderRecords = recordIndex >= 0 ? records.slice(recordIndex + 1) : records;
  return new Map(record.exercises.map((exercise) => {
    const previous = olderRecords.flatMap((item) => item.exercises).find((item) => item.id === exercise.id && item.sets.some(isCompletedValidSet));
    const currentLatest = latestCompletedSet(exercise);
    const previousLatest = previous ? latestCompletedSet(previous) : undefined;
    return [exercise.id, {
      exerciseId: exercise.id,
      previousFound: Boolean(previous && previousLatest),
      weightChange: (currentLatest?.weight ?? 0) - (previousLatest?.weight ?? 0),
      repChange: (currentLatest?.reps ?? 0) - (previousLatest?.reps ?? 0),
      volumeChange: exerciseVolume(exercise) - (previous ? exerciseVolume(previous) : 0),
    }];
  }));
}

export function exerciseVolume(exercise: Exercise): number {
  return exercise.sets.filter(isCompletedValidSet).reduce((total, set) => total + set.weight * set.reps, 0);
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return "Duration unavailable";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes} min`;
}

export function deleteSessionRecord(records: SessionRecord[], recordId: string): SessionRecord[] {
  return records.filter((record) => record.id !== recordId);
}

function latestCompletedSet(exercise: Exercise): SetLog | undefined {
  const completed = exercise.sets.filter(isCompletedValidSet);
  return completed[completed.length - 1];
}

function isCompletedValidSet(set: SetLog): boolean {
  return set.completed && set.weight >= 0 && Number.isInteger(set.reps) && set.reps > 0;
}
