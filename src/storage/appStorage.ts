import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_COACHING_PROFILE } from "../domain/coaching";
import { personalBaselineRecords, personalBaselineWorkouts } from "../domain/personalBaseline";
import { AppState, CURRENT_SCHEMA_VERSION, DEFAULT_APP_SETTINGS, isProgramPreferences, isSessionRecordArray, isWorkoutArray, migrateStoredState, ProgramPreferences, StoredAppStateV9 } from "./migrations";

const APP_STATE_KEY = "ironforge-app-state";
const LEGACY_WORKOUTS_KEY = "ironforge-workouts-v1";
const LEGACY_HISTORY_KEY = "ironforge-history-v1";
const LEGACY_PROGRAM_KEY = "ironforge-program-v1";

export type { AppState, ProgramPreferences } from "./migrations";

const defaultProgram: ProgramPreferences = { trainingDays: 4, phase: "hypertrophy" };

export function createDefaultAppState(): AppState {
  return { workouts: personalBaselineWorkouts(), records: personalBaselineRecords(), program: { ...defaultProgram }, activeSession: null, coachingProfile: { ...DEFAULT_COACHING_PROFILE }, coachingDecisions: [], settings: { ...DEFAULT_APP_SETTINGS } };
}

export async function loadAppState(): Promise<AppState> {
  const stored = await AsyncStorage.getItem(APP_STATE_KEY);
  if (stored) {
    const migrated = migrateStoredState(parseJson(stored));
    if (migrated) return migrated;
    console.warn("Ki: stored app state is invalid; loading defaults.");
    return createDefaultAppState();
  }
  return loadLegacyState();
}

export async function saveAppState(state: AppState): Promise<void> {
  const stored: StoredAppStateV9 = { schemaVersion: CURRENT_SCHEMA_VERSION, ...state };
  await AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(stored));
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
    activeSession: null,
    coachingProfile: { ...DEFAULT_COACHING_PROFILE },
    coachingDecisions: [],
    settings: { ...DEFAULT_APP_SETTINGS },
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
