import { Workout } from "./training";
import { TrainingSplit, trainingSplitLabel } from "./programGenerator";

export type TemporaryPlanStatus = "draft" | "active" | "completed";

export type TemporaryTrainingPlan = {
  id: string;
  name: string;
  status: TemporaryPlanStatus;
  createdAt: string;
  startsAt: string;
  endsAt: string;
  workouts: Workout[];
  trainingSplit: TrainingSplit;
};

export function createTemporaryPlan(workouts: Workout[], startsAt: string, endsAt: string, trainingSplit: TrainingSplit = "auto", now = new Date()): TemporaryTrainingPlan {
  return {
    id: `temporary-${now.getTime()}`,
    name: `Temporary ${trainingSplitLabel(trainingSplit)} Plan`,
    status: "draft",
    createdAt: now.toISOString(),
    startsAt,
    endsAt,
    workouts: workouts.map((workout, index) => ({
      ...workout,
      id: `temporary-${now.getTime()}-${index + 1}`,
      title: `Day ${index + 1} · ${workout.title.split(" · ").pop()}`,
      exercises: workout.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set, completed: false })) })),
    })),
    trainingSplit,
  };
}

export function validateTemporaryPlanDates(startsAt: string, endsAt: string): string | null {
  const start = dateOnly(startsAt);
  const end = dateOnly(endsAt);
  if (!start || !end) return "Enter dates as YYYY-MM-DD.";
  if (end.getTime() < start.getTime()) return "The end date must be on or after the start date.";
  return null;
}

export function isTemporaryPlanCurrent(plan: TemporaryTrainingPlan, now = new Date()): boolean {
  const start = dateOnly(plan.startsAt);
  const end = dateOnly(plan.endsAt);
  if (!start || !end || plan.status !== "active") return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today.getTime() >= start.getTime() && today.getTime() <= end.getTime();
}

export function completeExpiredTemporaryPlans(plans: TemporaryTrainingPlan[], now = new Date()): TemporaryTrainingPlan[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return plans.map((plan) => {
    const end = dateOnly(plan.endsAt);
    return plan.status === "active" && end && today.getTime() > end.getTime() ? { ...plan, status: "completed" } : plan;
  });
}

function dateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
