import { afterEach, describe, expect, it, vi } from "vitest";
import { initialFourDaySplit, startActiveSession } from "../domain/training";
import { migrateStoredState } from "./migrations";

const program = { trainingDays: 4, phase: "hypertrophy" as const };

afterEach(() => vi.restoreAllMocks());

describe("storage migrations", () => {
  it("migrates schema version 1 with no active session", () => {
    const migrated = migrateStoredState({ schemaVersion: 1, workouts: initialFourDaySplit(), records: [], program });
    expect(migrated?.program).toEqual(program);
    expect(migrated?.activeSession).toBeNull();
  });

  it("restores a valid schema version 2 active session", () => {
    const workouts = initialFourDaySplit();
    const activeSession = startActiveSession(workouts[1], new Date("2026-01-01T10:00:00.000Z"));
    const migrated = migrateStoredState({ schemaVersion: 2, workouts, records: [], program, activeSession });
    expect(migrated?.activeSession).toEqual(activeSession);
  });

  it("rejects malformed state", () => {
    expect(migrateStoredState({ schemaVersion: 2, workouts: [], records: [], program, activeSession: null })).toBeNull();
    expect(migrateStoredState({ schemaVersion: 1, workouts: initialFourDaySplit(), records: "invalid", program })).toBeNull();
  });

  it("rejects unsupported future schemas without throwing", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(migrateStoredState({ schemaVersion: 99 })).toBeNull();
    expect(warning).toHaveBeenCalledWith("IronForge: unsupported storage schema version 99.");
  });
});
