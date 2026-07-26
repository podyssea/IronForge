import { ActiveSession, Exercise, SessionRecord, TrainingPhase, Workout } from "../domain/training";
import { CoachingDecision, CoachingProfile, DEFAULT_COACHING_PROFILE } from "../domain/coaching";
import { Equipment, ExperienceLevel, TrainingStyle } from "../domain/exerciseLibrary";
import { personalBaselineRecords, personalBaselineWorkouts } from "../domain/personalBaseline";

export const CURRENT_SCHEMA_VERSION = 8;

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
  coachingDecisions: CoachingDecision[];
};

type StoredAppStateV1 = Omit<AppState, "activeSession" | "coachingProfile" | "coachingDecisions"> & { schemaVersion: 1 };
type StoredAppStateV2 = Omit<AppState, "coachingProfile" | "coachingDecisions"> & { schemaVersion: 2 };
export type StoredAppStateV3 = Omit<AppState, "coachingDecisions"> & { schemaVersion: 3 };
export type StoredAppStateV4 = Omit<AppState, "coachingDecisions"> & { schemaVersion: 4 };
export type StoredAppStateV5 = AppState & { schemaVersion: 5 };
export type StoredAppStateV6 = AppState & { schemaVersion: 6 };
export type StoredAppStateV7 = AppState & { schemaVersion: 7 };
export type StoredAppStateV8 = AppState & { schemaVersion: 8 };

export function migrateStoredState(value: unknown): AppState | null {
  if (!isRecord(value) || typeof value.schemaVersion !== "number") return null;
  switch (value.schemaVersion) {
    case 1:
      return isStoredAppStateV1(value) ? { workouts: value.workouts, records: normalizeRecords(value.records), program: value.program, activeSession: null, coachingProfile: { ...DEFAULT_COACHING_PROFILE }, coachingDecisions: [] } : null;
    case 2:
      return isStoredAppStateV2(value) ? { workouts: value.workouts, records: normalizeRecords(value.records), program: value.program, activeSession: normalizeActiveSession(value.activeSession), coachingProfile: { ...DEFAULT_COACHING_PROFILE }, coachingDecisions: [] } : null;
    case 3:
      return isStoredAppStateV3(value) ? { workouts: value.workouts, records: normalizeRecords(value.records), program: value.program, activeSession: normalizeActiveSession(value.activeSession), coachingProfile: value.coachingProfile, coachingDecisions: [] } : null;
    case 4:
      return isStoredAppStateV4(value) ? { workouts: value.workouts, records: normalizeRecords(value.records), program: value.program, activeSession: value.activeSession, coachingProfile: value.coachingProfile, coachingDecisions: [] } : null;
    case 5:
      return isStoredAppStateV5(value) ? {
        workouts: personalBaselineWorkouts(),
        records: personalBaselineRecords(),
        program: { trainingDays: 4, phase: "hypertrophy" },
        activeSession: null,
        coachingProfile: value.coachingProfile,
        coachingDecisions: [],
      } : null;
    case 6:
      return isStoredAppStateV6(value) ? {
        workouts: personalBaselineWorkouts(),
        records: personalBaselineRecords(),
        program: { trainingDays: 4, phase: "hypertrophy" },
        activeSession: null,
        coachingProfile: value.coachingProfile,
        coachingDecisions: [],
      } : null;
    case 7:
      return isStoredAppStateV7(value) ? { workouts: value.workouts, records: normalizeRecords(value.records), program: value.program, activeSession: value.activeSession, coachingProfile: value.coachingProfile, coachingDecisions: value.coachingDecisions } : null;
    case 8:
      return isStoredAppStateV8(value) ? { workouts: value.workouts, records: normalizeRecords(value.records), program: value.program, activeSession: value.activeSession, coachingProfile: value.coachingProfile, coachingDecisions: value.coachingDecisions } : null;
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
    && (record.readiness === undefined || isReadiness(record.readiness))
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

function isStoredAppStateV4(value: Record<string, unknown>): value is StoredAppStateV4 {
  return value.schemaVersion === 4
    && isWorkoutArray(value.workouts)
    && isSessionRecordArray(value.records)
    && isProgramPreferences(value.program)
    && (value.activeSession === null || (isActiveSession(value.activeSession) && typeof value.activeSession.notes === "string"))
    && isCoachingProfile(value.coachingProfile);
}

function isStoredAppStateV5(value: Record<string, unknown>): value is StoredAppStateV5 {
  return value.schemaVersion === 5
    && isWorkoutArray(value.workouts)
    && isSessionRecordArray(value.records)
    && isProgramPreferences(value.program)
    && (value.activeSession === null || (isActiveSession(value.activeSession) && typeof value.activeSession.notes === "string"))
    && isCoachingProfile(value.coachingProfile)
    && Array.isArray(value.coachingDecisions)
    && value.coachingDecisions.every(isCoachingDecision);
}

function isStoredAppStateV6(value: Record<string, unknown>): value is StoredAppStateV6 {
  return value.schemaVersion === 6
    && isWorkoutArray(value.workouts)
    && isSessionRecordArray(value.records)
    && isProgramPreferences(value.program)
    && (value.activeSession === null || (isActiveSession(value.activeSession) && typeof value.activeSession.notes === "string"))
    && isCoachingProfile(value.coachingProfile)
    && Array.isArray(value.coachingDecisions)
    && value.coachingDecisions.every(isCoachingDecision);
}

function isStoredAppStateV7(value: Record<string, unknown>): value is StoredAppStateV7 {
  return value.schemaVersion === 7
    && isWorkoutArray(value.workouts)
    && isSessionRecordArray(value.records)
    && isProgramPreferences(value.program)
    && (value.activeSession === null || (isActiveSession(value.activeSession) && typeof value.activeSession.notes === "string"))
    && isCoachingProfile(value.coachingProfile)
    && Array.isArray(value.coachingDecisions)
    && value.coachingDecisions.every(isCoachingDecision);
}

function isStoredAppStateV8(value: Record<string, unknown>): value is StoredAppStateV8 {
  return value.schemaVersion === 8
    && isWorkoutArray(value.workouts)
    && isSessionRecordArray(value.records)
    && isProgramPreferences(value.program)
    && (value.activeSession === null || (isActiveSession(value.activeSession) && typeof value.activeSession.notes === "string"))
    && isCoachingProfile(value.coachingProfile)
    && Array.isArray(value.coachingDecisions)
    && value.coachingDecisions.every(isCoachingDecision);
}

function isCoachingDecision(value: unknown): value is CoachingDecision {
  return isRecord(value)
    && typeof value.recommendationId === "string"
    && typeof value.decidedAt === "string"
    && (value.outcome === "accepted" || value.outcome === "modified" || value.outcome === "rejected")
    && isFiniteNumber(value.selectedWeight)
    && value.selectedWeight >= 0;
}

function normalizeRecords(records: SessionRecord[]): SessionRecord[] {
  return records.map((record) => ({ ...record, notes: record.notes ?? "" }));
}

function normalizeActiveSession(session: ActiveSession | null): ActiveSession | null {
  return session ? { ...session, notes: typeof session.notes === "string" ? session.notes : "" } : null;
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
    && (value.selectionReason === undefined || typeof value.selectionReason === "string")
    && (value.loadingType === undefined || value.loadingType === "pin-loaded" || value.loadingType === "plate-loaded")
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
    && (value.readiness === undefined || isReadiness(value.readiness))
    && Array.isArray(value.exercises)
    && value.exercises.every(isExercise);
}

function isReadiness(value: unknown): boolean {
  return isRecord(value)
    && isScaleValue(value.energy)
    && isScaleValue(value.sleep)
    && isScaleValue(value.soreness)
    && Number.isInteger(value.score)
    && (value.score as number) >= 0
    && (value.score as number) <= 100
    && (value.level === "ready" || value.level === "moderate" || value.level === "low");
}

function isScaleValue(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
