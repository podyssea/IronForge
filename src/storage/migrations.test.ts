import { afterEach, describe, expect, it, vi } from "vitest";
import { initialFourDaySplit, startActiveSession } from "../domain/training";
import { DEFAULT_APP_SETTINGS, migrateStoredState } from "./migrations";
import { DEFAULT_COACHING_PROFILE } from "../domain/coaching";

const program = { trainingDays: 4, phase: "hypertrophy" as const };

afterEach(() => vi.restoreAllMocks());

describe("storage migrations", () => {
  it("migrates schema version 1 with no active session", () => {
    const migrated = migrateStoredState({ schemaVersion: 1, workouts: initialFourDaySplit(), records: [], program });
    expect(migrated?.program).toEqual(program);
    expect(migrated?.activeSession).toBeNull();
    expect(migrated?.coachingProfile).toEqual(DEFAULT_COACHING_PROFILE);
    expect(migrated?.coachingDecisions).toEqual([]);
  });

  it("restores a valid schema version 2 active session", () => {
    const workouts = initialFourDaySplit();
    const activeSession = startActiveSession(workouts[1], new Date("2026-01-01T10:00:00.000Z"));
    const migrated = migrateStoredState({ schemaVersion: 2, workouts, records: [], program, activeSession });
    expect(migrated?.activeSession).toEqual(activeSession);
    expect(migrated?.coachingProfile).toEqual(DEFAULT_COACHING_PROFILE);
  });

  it("restores schema version 3 coaching preferences", () => {
    const workouts = initialFourDaySplit();
    const coachingProfile = { ...DEFAULT_COACHING_PROFILE, goal: "strength" as const, sessionMinutes: 75, availableEquipment: ["barbell", "dumbbell"] as const };
    const migrated = migrateStoredState({ schemaVersion: 3, workouts, records: [], program, activeSession: null, coachingProfile });
    expect(migrated?.coachingProfile).toEqual(coachingProfile);
  });

  it("migrates schema version 3 journal data and active notes", () => {
    const workouts = initialFourDaySplit();
    const activeSession = startActiveSession(workouts[0]);
    const legacyActive = { ...activeSession } as Record<string, unknown>;
    delete legacyActive.notes;
    const legacyRecord = { id: "legacy", completedAt: "2025-01-01T10:00:00.000Z", workoutTitle: "Upper", exercises: workouts[0].exercises, volume: 0 };
    const migrated = migrateStoredState({ schemaVersion: 3, workouts, records: [legacyRecord], program, activeSession: legacyActive, coachingProfile: DEFAULT_COACHING_PROFILE });
    expect(migrated?.activeSession?.notes).toBe("");
    expect(migrated?.records[0].notes).toBe("");
    expect(migrated?.records[0].durationSeconds).toBeUndefined();
  });

  it("restores schema version 4 journal fields", () => {
    const workouts = initialFourDaySplit();
    const activeSession = startActiveSession(workouts[0]);
    activeSession.notes = "In progress";
    const migrated = migrateStoredState({ schemaVersion: 4, workouts, records: [], program, activeSession, coachingProfile: DEFAULT_COACHING_PROFILE });
    expect(migrated?.activeSession?.notes).toBe("In progress");
    expect(migrated?.coachingDecisions).toEqual([]);
  });

  it("replaces schema version 5 data with the personal baseline once", () => {
    const workouts = initialFourDaySplit();
    const coachingDecisions = [{ recommendationId: "upper-a:incline-smith:1", decidedAt: "2026-01-01T10:00:00.000Z", outcome: "modified" as const, selectedWeight: 37.5 }];
    const migrated = migrateStoredState({ schemaVersion: 5, workouts, records: [], program, activeSession: null, coachingProfile: DEFAULT_COACHING_PROFILE, coachingDecisions });
    expect(migrated?.workouts[0].exercises[0].lastWeight).toBe(90);
    expect(migrated?.records).toHaveLength(2);
    expect(migrated?.coachingDecisions).toEqual([]);
  });

  it("corrects a schema version 6 import that included future sessions", () => {
    const workouts = initialFourDaySplit();
    const migrated = migrateStoredState({ schemaVersion: 6, workouts, records: [], program, activeSession: null, coachingProfile: DEFAULT_COACHING_PROFILE, coachingDecisions: [] });
    expect(migrated?.workouts[0].exercises[0].lastWeight).toBe(90);
    expect(migrated?.records.map((record) => record.sourceWorkoutId)).toEqual(["lower-a", "upper-a"]);
  });

  it("restores schema version 7 without repeating the personal import", () => {
    const workouts = initialFourDaySplit();
    const migrated = migrateStoredState({ schemaVersion: 7, workouts, records: [], program, activeSession: null, coachingProfile: DEFAULT_COACHING_PROFILE, coachingDecisions: [] });
    expect(migrated?.workouts).toEqual(workouts);
    expect(migrated?.records).toEqual([]);
  });

  it("restores schema version 8 exercise loading types and readiness", () => {
    const workouts = initialFourDaySplit();
    workouts[0].exercises[0].loadingType = "plate-loaded";
    const activeSession = startActiveSession(workouts[0]);
    activeSession.readiness = { energy: 4, sleep: 5, soreness: 2, score: 80, level: "ready" };
    const migrated = migrateStoredState({ schemaVersion: 8, workouts, records: [], program, activeSession, coachingProfile: DEFAULT_COACHING_PROFILE, coachingDecisions: [] });
    expect(migrated?.workouts[0].exercises[0].loadingType).toBe("plate-loaded");
    expect(migrated?.activeSession?.readiness?.score).toBe(80);
    expect(migrated?.settings).toEqual(DEFAULT_APP_SETTINGS);
  });

  it("restores schema version 9 training settings and effort data", () => {
    const workouts = initialFourDaySplit();
    workouts[0].exercises[0].loadIncrement = 1.25;
    workouts[0].exercises[0].restSeconds = 150;
    workouts[0].exercises[0].sets[2].rir = 2;
    const settings = { weightUnit: "lb" as const, effortMetric: "rpe" as const, defaultRestSeconds: 120 };
    const migrated = migrateStoredState({ schemaVersion: 9, workouts, records: [], program, activeSession: null, coachingProfile: DEFAULT_COACHING_PROFILE, coachingDecisions: [], settings });
    expect(migrated?.settings).toEqual(settings);
    expect(migrated?.workouts[0].exercises[0]).toMatchObject({ loadIncrement: 1.25, restSeconds: 150 });
    expect(migrated?.workouts[0].exercises[0].sets[2].rir).toBe(2);
  });

  it("rejects malformed state", () => {
    expect(migrateStoredState({ schemaVersion: 7, workouts: [], records: [], program, activeSession: null, coachingProfile: DEFAULT_COACHING_PROFILE, coachingDecisions: [] })).toBeNull();
    expect(migrateStoredState({ schemaVersion: 1, workouts: initialFourDaySplit(), records: "invalid", program })).toBeNull();
  });

  it("rejects unsupported future schemas without throwing", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(migrateStoredState({ schemaVersion: 99 })).toBeNull();
    expect(warning).toHaveBeenCalledWith("IronForge: unsupported storage schema version 99.");
  });
});
