import { describe, expect, it } from "vitest";
import { createTemporaryPlan, completeExpiredTemporaryPlans, isTemporaryPlanCurrent, updateTemporaryPlanDraftWorkout, validateTemporaryPlanDates } from "./temporaryPlan";
import { initialFourDaySplit } from "./training";

describe("temporary training plans", () => {
  it("creates an independent editable three-day draft", () => {
    const source = initialFourDaySplit().slice(0, 3);
    const plan = createTemporaryPlan(source, "2026-09-01", "2026-09-07", "push-pull-legs", new Date("2026-08-31T10:00:00Z"));
    expect(plan.status).toBe("draft");
    expect(plan.workouts).toHaveLength(3);
    expect(plan.workouts[0].id).not.toBe(source[0].id);
    plan.workouts[0].exercises.pop();
    expect(source[0].exercises.length).toBeGreaterThan(plan.workouts[0].exercises.length);
  });

  it("validates the activation period", () => {
    expect(validateTemporaryPlanDates("2026-09-07", "2026-09-01")).toContain("end date");
    expect(validateTemporaryPlanDates("2026-09-01", "2026-09-07")).toBeNull();
  });

  it("activates only inside the period and completes after it", () => {
    const plan = { ...createTemporaryPlan(initialFourDaySplit().slice(0, 3), "2026-09-01", "2026-09-07"), status: "active" as const };
    expect(isTemporaryPlanCurrent(plan, new Date("2026-09-04T12:00:00"))).toBe(true);
    expect(isTemporaryPlanCurrent(plan, new Date("2026-09-08T12:00:00"))).toBe(false);
    expect(completeExpiredTemporaryPlans([plan], new Date("2026-09-08T12:00:00"))[0].status).toBe("completed");
  });

  it("updates only the identified workout in the identified draft", () => {
    const source = initialFourDaySplit();
    const target = createTemporaryPlan(source.slice(0, 3), "2026-09-01", "2026-09-07", "push-pull-legs", new Date("2026-08-31T10:00:00Z"));
    const other = createTemporaryPlan(source.slice(1, 4), "2026-10-01", "2026-10-07", "upper-lower", new Date("2026-09-30T10:00:00Z"));
    const plans = [target, other];
    const sourceSnapshot = structuredClone(source);
    const plansSnapshot = structuredClone(plans);
    const updatedWorkout = { ...target.workouts[1], title: "Day 2 · Edited", exercises: target.workouts[1].exercises.slice(0, -1) };

    const result = updateTemporaryPlanDraftWorkout(plans, target.id, updatedWorkout);

    expect(result).not.toBe(plans);
    expect(result[0].workouts[1]).toEqual(updatedWorkout);
    expect(result[0].workouts[0]).toEqual(plansSnapshot[0].workouts[0]);
    expect(result[1]).toEqual(plansSnapshot[1]);
    expect(plans).toEqual(plansSnapshot);
    expect(source).toEqual(sourceSnapshot);
  });

  it("does not update an active plan or an unknown workout", () => {
    const draft = createTemporaryPlan(initialFourDaySplit().slice(0, 3), "2026-09-01", "2026-09-07");
    const active = { ...draft, status: "active" as const };

    expect(updateTemporaryPlanDraftWorkout([active], active.id, active.workouts[0])).toEqual([active]);
    expect(updateTemporaryPlanDraftWorkout([draft], draft.id, { ...draft.workouts[0], id: "missing" })).toEqual([draft]);
  });
});
