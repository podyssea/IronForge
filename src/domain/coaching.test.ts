import { describe, expect, it } from "vitest";
import { applyCoachingRecommendation, buildWorkoutRecommendations, CoachingDecision } from "./coaching";
import { completeActiveSession, initialFourDaySplit, startActiveSession } from "./training";

function performance(reps: number, completedSets = 4, date = "2026-01-02T10:00:00.000Z") {
  const workout = initialFourDaySplit()[0];
  const session = startActiveSession(workout, new Date(date));
  session.exercises[0].sets = session.exercises[0].sets.map((set, index) => ({ ...set, reps, completed: index < completedSets }));
  return completeActiveSession(session, new Date(new Date(date).getTime() + 3_600_000));
}

describe("adaptive coaching", () => {
  it("holds after a single performance while building a trend", () => {
    const workout = initialFourDaySplit()[0];
    const recommendation = buildWorkoutRecommendations(workout, [performance(8)], [])[0];
    expect(recommendation.action).toBe("hold");
    expect(recommendation.reason).toContain("One performance");
  });

  it("increases load after two complete top-range performances", () => {
    const workout = initialFourDaySplit()[0];
    const records = [performance(8, 4, "2026-01-03T10:00:00.000Z"), performance(8)];
    const recommendation = buildWorkoutRecommendations(workout, records, [])[0];
    expect(recommendation.action).toBe("increase");
    expect(recommendation.suggestedWeight).toBe(36);
  });

  it("reduces load after two sessions with missed sets", () => {
    const workout = initialFourDaySplit()[0];
    const records = [performance(7, 2, "2026-01-03T10:00:00.000Z"), performance(7, 3)];
    const recommendation = buildWorkoutRecommendations(workout, records, [])[0];
    expect(recommendation.action).toBe("reduce");
    expect(recommendation.suggestedWeight).toBe(31.5);
  });

  it("hides recommendations that already have a decision", () => {
    const workout = initialFourDaySplit()[0];
    const records = [performance(8)];
    const recommendation = buildWorkoutRecommendations(workout, records, [])[0];
    const decision: CoachingDecision = { recommendationId: recommendation.id, decidedAt: new Date().toISOString(), outcome: "rejected", selectedWeight: recommendation.currentWeight };
    expect(buildWorkoutRecommendations(workout, records, [decision]).some((item) => item.exerciseId === recommendation.exerciseId)).toBe(false);
  });

  it("applies an accepted or modified load with scaled warm-ups", () => {
    const workouts = initialFourDaySplit();
    const recommendation = buildWorkoutRecommendations(workouts[0], [performance(8)], [])[0];
    const updated = applyCoachingRecommendation(workouts, recommendation, 37.2);
    expect(updated[0].exercises[0].lastWeight).toBe(37);
    expect(updated[0].exercises[0].sets.map((set) => set.weight)).toEqual([18.5, 26, 37, 37]);
  });
});
