import { describe, expect, it } from "vitest";
import { createDefaultAppState } from "./appStorage";
import { createBackupJson, restoreBackupJson } from "./backup";

describe("offline backup", () => {
  it("round-trips the complete app state", () => {
    const state = createDefaultAppState();
    state.workouts[0].exercises[0].loadingType = "plate-loaded";
    const json = createBackupJson(state, new Date("2026-07-29T12:00:00.000Z"));
    const restored = restoreBackupJson(json);
    expect(restored.state).toEqual(state);
    expect(restored.summary).toEqual({ exportedAt: "2026-07-29T12:00:00.000Z", workouts: 4, sessions: 2 });
  });

  it("rejects malformed and unrelated files", () => {
    expect(() => restoreBackupJson("not json")).toThrow("valid JSON");
    expect(() => restoreBackupJson(JSON.stringify({ format: "other" }))).toThrow("not a valid Ki backup");
  });

  it("rejects damaged state without replacing current data", () => {
    const value = JSON.parse(createBackupJson(createDefaultAppState())) as { state: { workouts: unknown[] } };
    value.state.workouts = [];
    expect(() => restoreBackupJson(JSON.stringify(value))).toThrow("damaged");
  });
});
