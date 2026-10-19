import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_COACHING_PROFILE } from "../domain/coaching";
import { personalBaselineRecords, personalBaselineWorkouts, strengthFocusedFourDaySplit } from "../domain/personalBaseline";
import { normalizeExercisePrescription } from "../domain/training";
import { AppState, CURRENT_SCHEMA_VERSION, DEFAULT_APP_SETTINGS, isProgramPreferences, isSessionRecordArray, isWorkoutArray, migrateStoredState, normalizeProgramPreferences, ProgramPreferences, StoredAppStateV14 } from "./migrations";

const APP_STATE_KEY = "ironforge-app-state";
const LEGACY_WORKOUTS_KEY = "ironforge-workouts-v1";
const LEGACY_HISTORY_KEY = "ironforge-history-v1";
const LEGACY_PROGRAM_KEY = "ironforge-program-v1";

export type { AppState, ProgramPreferences } from "./migrations";

function defaultProgram(): ProgramPreferences { return normalizeProgramPreferences({ trainingDays: 4, phase: "strength" }); }

export function createDefaultAppState(): AppState {
  const records = personalBaselineRecords();
  const workouts = strengthFocusedFourDaySplit(personalBaselineWorkouts(), records).map((workout) => ({ ...workout, exercises: workout.exercises.map(normalizeExercisePrescription) }));
  return { workouts, records, program: defaultProgram(), activeSession: null, coachingProfile: { ...DEFAULT_COACHING_PROFILE }, coachingDecisions: [], settings: { ...DEFAULT_APP_SETTINGS }, temporaryPlans: [], previousRoutine: null };
}

export async function loadAppState(): Promise<AppState> {
  const stored = await AsyncStorage.getItem(APP_STATE_KEY);
  if (stored) {
    const migrated = migrateStoredState(parseJson(stored));
    if (migrated) return migrated;
    console.warn("GymJournal: stored app state is invalid; loading defaults.");
    return createDefaultAppState();
  }
  return loadLegacyState();
}

export async function saveAppState(state: AppState): Promise<void> {
  const stored: StoredAppStateV14 = { schemaVersion: CURRENT_SCHEMA_VERSION, ...state };
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
    program: isProgramPreferences(program) ? normalizeProgramPreferences(program, isSessionRecordArray(records) ? records : []) : defaults.program,
    activeSession: null,
    coachingProfile: { ...DEFAULT_COACHING_PROFILE },
    coachingDecisions: [],
    settings: { ...DEFAULT_APP_SETTINGS },
    temporaryPlans: [],
    previousRoutine: null,
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
