export const CONVENTIONAL_DEADLIFT_ID = "conventional-deadlift";
export const DEADLIFT_BAR_KG = 20;
export const DEADLIFT_LOAD_STEP_KG = 5;
export const MAX_DEADLIFT_LOAD_KG = 2_000;
export const MAX_DEADLIFT_PLANNED_REPS = 12;

export const DEADLIFT_REP_SCHEMES = [
  { id: "five-by-five", label: "5×5", reps: [5, 5, 5, 5, 5] },
  { id: "three-by-three", label: "3×3", reps: [3, 3, 3] },
  { id: "descending", label: "5, 4, 3, 2, 2", reps: [5, 4, 3, 2, 2] },
  { id: "three-by-five", label: "3×5", reps: [5, 5, 5] },
  { id: "four-by-four", label: "4×4", reps: [4, 4, 4, 4] },
  { id: "three-by-six", label: "3×6", reps: [6, 6, 6] },
  { id: "three-by-eight", label: "3×8", reps: [8, 8, 8] },
] as const;

type DeadliftRepSchemeId = (typeof DEADLIFT_REP_SCHEMES)[number]["id"];
type DeadliftPlanSet = { weight: number; reps: number };
export type DeadliftCalculatorInput = { schemeId?: DeadliftRepSchemeId; referenceTripleKg?: number };

export function isDeadliftCalculatorInput(value: unknown): value is DeadliftCalculatorInput {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && (!("schemeId" in value) || value.schemeId === undefined || DEADLIFT_REP_SCHEMES.some(({ id }) => id === value.schemeId))
    && (!("referenceTripleKg" in value) || value.referenceTripleKg === undefined
      || (typeof value.referenceTripleKg === "number" && isDeadliftWorkingWeight(value.referenceTripleKg)));
}

export function isDeadliftWorkingWeight(weight: number): boolean {
  return weight >= DEADLIFT_BAR_KG && weight <= MAX_DEADLIFT_LOAD_KG
    && (weight - DEADLIFT_BAR_KG) % DEADLIFT_LOAD_STEP_KG === 0;
}

export function deadliftLoadAtOrBelow(weight: number): number {
  if (!Number.isFinite(weight) || weight < DEADLIFT_BAR_KG) return 0;
  return Math.floor(Math.min(weight, MAX_DEADLIFT_LOAD_KG) / DEADLIFT_LOAD_STEP_KG) * DEADLIFT_LOAD_STEP_KG;
}

export function deadliftWeightPerSide(totalWeight: number): number {
  return (totalWeight - DEADLIFT_BAR_KG) / 2;
}

// Ramp percentages are defaults relative to today's working weight.
// The final single adds practice near the working load on lower-rep days.
export function deadliftWarmup(workingWeight: number, upperReps: number): DeadliftPlanSet[] {
  if (!isDeadliftWorkingWeight(workingWeight)) return [];
  const stages = [{ fraction: 0.4, reps: 5 }, { fraction: 0.6, reps: 3 }, { fraction: 0.8, reps: 2 }];
  if (upperReps <= 5) stages.push({ fraction: 0.9, reps: 1 });
  const warmup: DeadliftPlanSet[] = [];
  for (const { fraction, reps } of stages) {
    const rounded = Math.round(workingWeight * fraction / DEADLIFT_LOAD_STEP_KG) * DEADLIFT_LOAD_STEP_KG;
    const weight = Math.max(DEADLIFT_BAR_KG, rounded);
    if (weight < workingWeight && weight !== warmup.at(-1)?.weight) warmup.push({ weight, reps });
  }
  return warmup;
}

export function calculateDeadliftPlan(schemeId?: DeadliftRepSchemeId, referenceTripleKg?: number, deload = false) {
  const scheme = DEADLIFT_REP_SCHEMES.find(({ id }) => id === schemeId);
  if (!scheme || referenceTripleKg === undefined || !isDeadliftWorkingWeight(referenceTripleKg)) return undefined;

  const referenceReps = 3;
  const reserveReps = 2;
  const loadScale = deload ? 0.75 : 1;
  const workingSets = scheme.reps.map((reps) => {
    // Invert the Epley relation with two estimated reps in reserve for the work sets.
    // Treat the completed triple as the reference and round work loads down to a plate pair.
    const estimatedLoad = referenceTripleKg * (30 + referenceReps) * loadScale / (30 + reps + reserveReps);
    return { weight: deadliftLoadAtOrBelow(Math.max(DEADLIFT_BAR_KG, estimatedLoad)), reps };
  });
  return { warmups: deadliftWarmup(workingSets[0].weight, Math.max(...scheme.reps)), workingSets };
}
