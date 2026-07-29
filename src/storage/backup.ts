import { AppState, CURRENT_SCHEMA_VERSION, migrateStoredState } from "./migrations";

const BACKUP_FORMAT = "ironforge-backup";

export type BackupSummary = {
  exportedAt: string;
  workouts: number;
  sessions: number;
};

export function createBackupJson(state: AppState, now = new Date()): string {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    state,
  }, null, 2);
}

export function restoreBackupJson(json: string): { state: AppState; summary: BackupSummary } {
  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch {
    throw new Error("This file does not contain valid JSON.");
  }
  if (!isRecord(value) || value.format !== BACKUP_FORMAT || typeof value.exportedAt !== "string" || typeof value.schemaVersion !== "number" || !isRecord(value.state)) {
    throw new Error("This is not a valid IronForge backup.");
  }
  const state = migrateStoredState({ ...value.state, schemaVersion: value.schemaVersion });
  if (!state) throw new Error("The backup is damaged or uses an unsupported version.");
  return {
    state,
    summary: {
      exportedAt: value.exportedAt,
      workouts: state.workouts.length,
      sessions: state.records.length,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
