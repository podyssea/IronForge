import { ActiveSession, Exercise, SessionRecord, TrainingPhase, Workout } from "../domain/training";
import { CoachingProfile, DEFAULT_COACHING_PROFILE } from "../domain/coaching";
import { Equipment, ExperienceLevel, TrainingStyle } from "../domain/exerciseLibrary";

export const CURRENT_SCHEMA_VERSION = 3;

export type ProgramPreferences = {
  trainingDays: number;
  phase: TrainingPhase;
};

export type AppState = {
  workouts: Workout[];
  records: SessionRecord[];
  program: ProgramPreferences;
  activeSession: ActiveSession | null;
  coachingProfile: CoachingProfile;
};

type StoredAppStateV1 = Omit<AppState, "activeSession" | "coachingProfile"> & { schemaVersion: 1 };
type StoredAppStateV2 = Omit<AppState, "coachingProfile"> & { schemaVersion: 2 };
export type StoredAppStateV3 = AppState & { schemaVersion: 3 };

export function migrateStoredState(value: unknown): AppState | null {
  if (!isRecord(value) || typeof value.schemaVersion !== "number") return null;
  switch (value.schemaVersion) {
    case 1:
      return isStoredAppStateV1(value) ? { workouts: value.workouts, records: value.records, program: value.program, activeSession: null, coachingProfile: { ...DEFAULT_COACHING_PROFILE } } : null;
    case 2:
      return isStoredAppStateV2(value) ? { workouts: value.workouts, records: value.records, program: value.program, activeSession: value.activeSession, coachingProfile: { ...DEFAULT_COACHING_PROFILE } } : null;
    case 3:
      return isStoredAppStateV3(value) ? { workouts: value.workouts, records: value.records, program: value.program, activeSession: value.activeSession, coachingProfile: value.coachingProfile } : null;
    default:
      console.warn(`IronForge: unsupported storage schema version ${value.schemaVersion}.`);
      return null;
  }
}

export function isWorkoutArray(value: unknown): value is Workout[] {
  return Array.isArray(value) && value.length > 0 && value.every(isWorkout);
}

export function isSessionRecordArray(value: unknown): value is SessionRecord[] {
  return Array.isArray(value) && value.every((record) => isRecord(record)
    && typeof record.id === "string"
    && typeof record.completedAt === "string"
    && typeof record.workoutTitle === "string"
    && Array.isArray(record.exercises)
    && record.exercises.every(isExercise)
    && isFiniteNumber(record.volume));
}

export function isProgramPreferences(value: unknown): value is ProgramPreferences {
  return isRecord(value)
    && Number.isInteger(value.trainingDays)
    && (value.trainingDays as number) >= 2
    && (value.trainingDays as number) <= 6
    && (value.phase === "strength" || value.phase === "hypertrophy" || value.phase === "deload");
}

function isStoredAppStateV1(value: Record<string, unknown>): value is StoredAppStateV1 {
  return value.schemaVersion === 1 && isWorkoutArray(value.workouts) && isSessionRecordArray(value.records) && isProgramPreferences(value.program);
}

function isStoredAppStateV2(value: Record<string, unknown>): value is StoredAppStateV2 {
  return value.schemaVersion === 2
    && isWorkoutArray(value.workouts)
    && isSessionRecordArray(value.records)
    && isProgramPreferences(value.program)
    && (value.activeSession === null || isActiveSession(value.activeSession));
}

function isStoredAppStateV3(value: Record<string, unknown>): value is StoredAppStateV3 {
  return value.schemaVersion === 3
    && isWorkoutArray(value.workouts)
    && isSessionRecordArray(value.records)
    && isProgramPreferences(value.program)
    && (value.activeSession === null || isActiveSession(value.activeSession))
    && isCoachingProfile(value.coachingProfile);
}

const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "cable", "machine", "smith-machine", "bodyweight", "resistance-band", "kettlebell"];
const GOALS: TrainingStyle[] = ["strength", "hypertrophy", "general-fitness", "muscular-endurance"];
const EXPERIENCE: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

function isCoachingProfile(value: unknown): value is CoachingProfile {
  return isRecord(value)
    && GOALS.includes(value.goal as TrainingStyle)
    && EXPERIENCE.includes(value.experience as ExperienceLevel)
    && Number.isInteger(value.sessionMinutes)
    && (value.sessionMinutes as number) >= 20
    && (value.sessionMinutes as number) <= 180
    && Array.isArray(value.availableEquipment)
    && value.availableEquipment.every((item) => EQUIPMENT.includes(item))
    && Array.isArray(value.preferredExerciseIds)
    && value.preferredExerciseIds.every((item) => typeof item === "string")
    && Array.isArray(value.excludedExerciseIds)
    && value.excludedExerciseIds.every((item) => typeof item === "string");
}

function isWorkout(value: unknown): value is Workout {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.focus === "string"
    && Array.isArray(value.exercises)
    && value.exercises.every(isExercise);
}

function isExercise(value: unknown): value is Exercise {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.name === "string"
    && isFiniteNumber(value.targetSets)
    && Array.isArray(value.repRange)
    && value.repRange.length === 2
    && value.repRange.every(isFiniteNumber)
    && isFiniteNumber(value.lastWeight)
    && isFiniteNumber(value.lastReps)
    && Array.isArray(value.sets)
    && value.sets.every((set) => isRecord(set) && isFiniteNumber(set.weight) && isFiniteNumber(set.reps) && typeof set.completed === "boolean");
}

function isActiveSession(value: unknown): value is ActiveSession {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.workoutId === "string"
    && typeof value.workoutTitle === "string"
    && typeof value.focus === "string"
    && typeof value.startedAt === "string"
    && Array.isArray(value.exercises)
    && value.exercises.every(isExercise);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
