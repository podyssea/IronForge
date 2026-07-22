import AsyncStorage from "@react-native-async-storage/async-storage";
import { Exercise, initialFourDaySplit, SessionRecord, TrainingPhase, Workout } from "../domain/training";

const APP_STATE_KEY = "ironforge-app-state";
const LEGACY_WORKOUTS_KEY = "ironforge-workouts-v1";
const LEGACY_HISTORY_KEY = "ironforge-history-v1";
const LEGACY_PROGRAM_KEY = "ironforge-program-v1";
const CURRENT_SCHEMA_VERSION = 1;

export type ProgramPreferences = {
  trainingDays: number;
  phase: TrainingPhase;
};

export type AppState = {
  workouts: Workout[];
  records: SessionRecord[];
  program: ProgramPreferences;
};

type StoredAppStateV1 = AppState & {
  schemaVersion: 1;
};

const defaultProgram: ProgramPreferences = {
  trainingDays: 4,
  phase: "hypertrophy",
};

export function createDefaultAppState(): AppState {
  return {
    workouts: initialFourDaySplit(),
    records: [],
    program: { ...defaultProgram },
  };
}

export async function loadAppState(): Promise<AppState> {
  const stored = await AsyncStorage.getItem(APP_STATE_KEY);
  if (stored) {
    const migrated = migrateStoredState(parseJson(stored));
    if (migrated) return migrated;
    console.warn("IronForge: stored app state is invalid; loading defaults.");
    return createDefaultAppState();
  }

  return loadLegacyState();
}

export async function saveAppState(state: AppState): Promise<void> {
  const stored: StoredAppStateV1 = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ...state,
  };
  await AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(stored));
}

function migrateStoredState(value: unknown): AppState | null {
  if (!isRecord(value) || typeof value.schemaVersion !== "number") return null;

  switch (value.schemaVersion) {
    case 1:
      return isAppState(value) ? toAppState(value) : null;
    default:
      console.warn(`IronForge: unsupported storage schema version ${value.schemaVersion}.`);
      return null;
  }
}

async function loadLegacyState(): Promise<AppState> {
  const defaults = createDefaultAppState();
  const [workoutsJson, recordsJson, programJson] = await Promise.all([
    AsyncStorage.getItem(LEGACY_WORKOUTS_KEY),
    AsyncStorage.getItem(LEGACY_HISTORY_KEY),
    AsyncStorage.getItem(LEGACY_PROGRAM_KEY),
  ]);

  const workouts = parseJson(workoutsJson);
  const records = parseJson(recordsJson);
  const program = parseJson(programJson);

  return {
    workouts: isWorkoutArray(workouts) ? workouts : defaults.workouts,
    records: isSessionRecordArray(records) ? records : defaults.records,
    program: isProgramPreferences(program) ? program : defaults.program,
  };
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function toAppState(value: StoredAppStateV1): AppState {
  return {
    workouts: value.workouts,
    records: value.records,
    program: value.program,
  };
}

function isAppState(value: Record<string, unknown>): value is StoredAppStateV1 {
  return value.schemaVersion === 1
    && isWorkoutArray(value.workouts)
    && isSessionRecordArray(value.records)
    && isProgramPreferences(value.program);
}

function isWorkoutArray(value: unknown): value is Workout[] {
  return Array.isArray(value) && value.length > 0 && value.every(isWorkout);
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
    && value.sets.every((set) => isRecord(set)
      && isFiniteNumber(set.weight)
      && isFiniteNumber(set.reps)
      && typeof set.completed === "boolean");
}

function isSessionRecordArray(value: unknown): value is SessionRecord[] {
  return Array.isArray(value) && value.every((record) => isRecord(record)
    && typeof record.id === "string"
    && typeof record.completedAt === "string"
    && typeof record.workoutTitle === "string"
    && Array.isArray(record.exercises)
    && record.exercises.every(isExercise)
    && isFiniteNumber(record.volume));
}

function isProgramPreferences(value: unknown): value is ProgramPreferences {
  return isRecord(value)
    && Number.isInteger(value.trainingDays)
    && (value.trainingDays as number) >= 2
    && (value.trainingDays as number) <= 6
    && (value.phase === "strength" || value.phase === "hypertrophy" || value.phase === "deload");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
