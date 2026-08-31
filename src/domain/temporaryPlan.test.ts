import { describe, expect, it } from "vitest";
import { createTemporaryPlan, completeExpiredTemporaryPlans, isTemporaryPlanCurrent, validateTemporaryPlanDates } from "./temporaryPlan";
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
});
