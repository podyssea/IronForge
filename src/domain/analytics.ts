import { isWorkingSet, SessionRecord, SetLog } from "./training";

export type AnalyticsRange = 7 | 30 | "all";
export type ExerciseProgress = { recordId: string; completedAt: string; weight: number; reps: number; volume: number };
export type ExerciseRecord = { exerciseId: string; exerciseName: string; maxWeight: number; maxReps: number; bestSetVolume: number; achievedAt: string };
export type TrainingAnalytics = {
  sessions: number;
  sets: number;
  volume: number;
  warmupSets: number;
  workingSets: number;
  warmupVolume: number;
  workingVolume: number;
  durationSeconds: number;
  consistencyPercent: number;
  volumeChangePercent?: number;
  coachSummary: string;
};

export function recordsInRange(records: SessionRecord[], range: AnalyticsRange, now = new Date()): SessionRecord[] {
  if (range === "all") return records;
  const cutoff = now.getTime() - range * 24 * 60 * 60 * 1000;
  return records.filter((record) => new Date(record.completedAt).getTime() >= cutoff && new Date(record.completedAt).getTime() <= now.getTime());
}

export function calculateAnalytics(records: SessionRecord[], range: AnalyticsRange, plannedWeeklySessions: number, now = new Date()): TrainingAnalytics {
  const selected = recordsInRange(records, range, now);
  const completed = selected.flatMap((record) => record.exercises.flatMap((exercise) => exercise.sets.map((set, index) => ({ set, working: isWorkingSet(exercise, index) })))).filter(({ set }) => set.completed);
  const sets = completed.length;
  const volume = selected.reduce((sum, record) => sum + record.volume, 0);
  const warmupSets = completed.filter(({ working }) => !working).length;
  const workingSets = completed.filter(({ working }) => working).length;
  const warmupVolume = completed.filter(({ working }) => !working).reduce((sum, { set }) => sum + setVolume(set), 0);
  const workingVolume = completed.filter(({ working }) => working).reduce((sum, { set }) => sum + setVolume(set), 0);
  const durationSeconds = selected.reduce((sum, record) => sum + (record.durationSeconds ?? 0), 0);
  const expected = range === "all" ? selected.length : Math.max(1, plannedWeeklySessions * (range / 7));
  const consistencyPercent = Math.min(100, Math.round(selected.length / expected * 100));
  const volumeChangePercent = range === "all" ? undefined : comparePriorVolume(records, range, workingVolume, now);
  return { sessions: selected.length, sets, volume, warmupSets, workingSets, warmupVolume, workingVolume, durationSeconds, consistencyPercent, volumeChangePercent, coachSummary: coachSummary(selected.length, consistencyPercent, volumeChangePercent) };
}

function comparePriorVolume(records: SessionRecord[], days: number, currentVolume: number, now: Date): number | undefined {
  const currentCutoff = now.getTime() - days * 86_400_000;
  const priorCutoff = currentCutoff - days * 86_400_000;
  const priorVolume = records.filter((record) => {
    const time = new Date(record.completedAt).getTime();
    return time >= priorCutoff && time < currentCutoff;
  }).flatMap((record) => record.exercises.flatMap((exercise) => exercise.sets.filter((set, index) => set.completed && isWorkingSet(exercise, index))))
    .reduce((sum, set) => sum + setVolume(set), 0);
  return priorVolume ? Math.round((currentVolume - priorVolume) / priorVolume * 100) : undefined;
}

function coachSummary(sessions: number, consistency: number, volumeChange?: number): string {
  if (!sessions) return "Complete your next workout to start building a measurable training trend.";
  if (consistency >= 100) return volumeChange !== undefined ? `Training frequency is on target and volume is ${Math.abs(volumeChange)}% ${volumeChange >= 0 ? "higher" : "lower"} than the previous period.` : "Training frequency is on target. Keep logging sessions to unlock volume comparisons.";
  if (consistency >= 50) return "You are building momentum. Complete the remaining planned sessions to keep progression reliable.";
  return "Training frequency is below plan. Prioritize consistency before increasing total workload.";
}

export function exerciseProgress(records: SessionRecord[], exerciseId: string, range: AnalyticsRange, now = new Date()): ExerciseProgress[] {
  return recordsInRange(records, range, now).flatMap((record) => {
    const exercise = record.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return [];
    const completed = exercise.sets.filter((set, index) => set.completed && isWorkingSet(exercise, index));
    if (!completed.length) return [];
    const best = completed.reduce((winner, set) => set.weight * set.reps > winner.weight * winner.reps ? set : winner);
    return [{ recordId: record.id, completedAt: record.completedAt, weight: best.weight, reps: best.reps, volume: completed.reduce((sum, set) => sum + set.weight * set.reps, 0) }];
  }).reverse();
}

export function personalRecords(records: SessionRecord[]): ExerciseRecord[] {
  const results = new Map<string, ExerciseRecord>();
  records.slice().reverse().forEach((record) => record.exercises.forEach((exercise) => {
    const completed = exercise.sets.filter((set, index) => set.completed && isWorkingSet(exercise, index));
    if (!completed.length) return;
    const prior = results.get(exercise.id);
    const maxWeight = Math.max(...completed.map((set) => set.weight), prior?.maxWeight ?? 0);
    const maxReps = Math.max(...completed.map((set) => set.reps), prior?.maxReps ?? 0);
    const bestSetVolume = Math.max(...completed.map(setVolume), prior?.bestSetVolume ?? 0);
    results.set(exercise.id, { exerciseId: exercise.id, exerciseName: exercise.name, maxWeight, maxReps, bestSetVolume, achievedAt: bestSetVolume > (prior?.bestSetVolume ?? -1) ? record.completedAt : prior?.achievedAt ?? record.completedAt });
  }));
  return [...results.values()].sort((a, b) => b.bestSetVolume - a.bestSetVolume);
}

function setVolume(set: SetLog): number {
  return set.weight * set.reps;
}
