import { CoachingProfile } from "./coaching";
import { EXERCISE_LIBRARY, ExerciseDefinition, ExperienceLevel, MovementPattern, TrainingStyle } from "./exerciseLibrary";
import { Exercise, normalizeExercisePrescription, SessionRecord, Workout } from "./training";

type DayTemplate = { name: string; focus: string; patterns: MovementPattern[] };

export type TrainingSplit = "auto" | "push-pull-legs" | "upper-lower" | "full-body" | "bro-split" | "classic-physique";

export const TRAINING_SPLIT_OPTIONS: { value: TrainingSplit; label: string; detail: string }[] = [
  { value: "auto", label: "Smart recommendation", detail: "Uses the best fit for your training days" },
  { value: "push-pull-legs", label: "Push / Pull / Legs", detail: "Chest-shoulders-triceps, back-biceps, then legs" },
  { value: "upper-lower", label: "Upper / Lower", detail: "Balanced upper- and lower-body sessions" },
  { value: "full-body", label: "Full body", detail: "Each session trains the whole body" },
  { value: "bro-split", label: "Bro split", detail: "Focused body-part sessions with high local volume" },
  { value: "classic-physique", label: "Classic physique", detail: "CBum-inspired aesthetic specialization" },
];

const difficultyRank: Record<ExperienceLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 };

const templates: Record<number, DayTemplate[]> = {
  2: [
    { name: "Full Body A", focus: "Balanced full-body strength and muscle", patterns: ["squat", "horizontal-push", "vertical-pull", "hinge", "vertical-push", "elbow-flexion", "core"] },
    { name: "Full Body B", focus: "Balanced full-body variation and recovery", patterns: ["hinge", "horizontal-pull", "horizontal-push", "lunge", "knee-flexion", "elbow-extension", "calf-raise"] },
  ],
  3: [
    { name: "Upper Body", focus: "Complete upper-body development", patterns: ["horizontal-push", "vertical-pull", "vertical-push", "horizontal-pull", "shoulder-isolation", "elbow-flexion", "elbow-extension"] },
    { name: "Lower Body", focus: "Quads, posterior chain and core", patterns: ["squat", "hinge", "lunge", "knee-flexion", "hip-isolation", "calf-raise", "core"] },
    { name: "Full Body", focus: "Second weekly stimulus across major patterns", patterns: ["squat", "horizontal-push", "horizontal-pull", "hinge", "vertical-pull", "shoulder-isolation", "core"] },
  ],
  4: [
    { name: "Upper A", focus: "Horizontal push and pull emphasis", patterns: ["horizontal-push", "horizontal-pull", "vertical-push", "vertical-pull", "shoulder-isolation", "elbow-flexion", "elbow-extension"] },
    { name: "Lower A", focus: "Squat and quadriceps emphasis", patterns: ["squat", "lunge", "hinge", "knee-flexion", "hip-isolation", "calf-raise", "core"] },
    { name: "Upper B", focus: "Vertical pull and shoulder emphasis", patterns: ["vertical-pull", "vertical-push", "horizontal-push", "horizontal-pull", "shoulder-isolation", "elbow-flexion", "elbow-extension"] },
    { name: "Lower B", focus: "Hinge and posterior-chain emphasis", patterns: ["hinge", "squat", "knee-flexion", "lunge", "hip-isolation", "calf-raise", "core"] },
  ],
  5: [
    { name: "Push", focus: "Chest, shoulders and triceps", patterns: ["horizontal-push", "vertical-push", "horizontal-push", "shoulder-isolation", "elbow-extension", "core"] },
    { name: "Pull", focus: "Back, rear delts and biceps", patterns: ["vertical-pull", "horizontal-pull", "vertical-pull", "horizontal-pull", "shoulder-isolation", "elbow-flexion"] },
    { name: "Legs", focus: "Complete lower-body development", patterns: ["squat", "hinge", "lunge", "knee-flexion", "hip-isolation", "calf-raise", "core"] },
    { name: "Upper", focus: "Second upper-body growth stimulus", patterns: ["horizontal-push", "horizontal-pull", "vertical-push", "vertical-pull", "shoulder-isolation", "elbow-flexion", "elbow-extension"] },
    { name: "Lower", focus: "Second lower-body growth stimulus", patterns: ["hinge", "squat", "lunge", "knee-flexion", "hip-isolation", "calf-raise", "core"] },
  ],
};

const classicPhysiqueTemplates: Record<number, DayTemplate[]> = {
  2: [
    { name: "Classic Upper", focus: "Upper chest, back width, delts and arms", patterns: ["horizontal-push", "vertical-pull", "horizontal-pull", "vertical-push", "horizontal-push", "shoulder-isolation", "elbow-flexion", "elbow-extension"] },
    { name: "Classic Lower", focus: "Quad sweep, hamstrings, glutes and calves", patterns: ["squat", "hinge", "squat", "knee-flexion", "lunge", "calf-raise", "hip-isolation", "core"] },
  ],
  3: [
    { name: "Chest & Back", focus: "Antagonist pairing for upper chest, width and thickness", patterns: ["horizontal-push", "vertical-pull", "horizontal-push", "horizontal-pull", "vertical-pull", "horizontal-pull"] },
    { name: "Legs", focus: "Quad sweep, hamstrings and complete lower-body detail", patterns: ["squat", "hinge", "squat", "knee-flexion", "lunge", "calf-raise", "hip-isolation"] },
    { name: "Shoulders & Arms", focus: "Capped delts and balanced arm development", patterns: ["vertical-push", "shoulder-isolation", "shoulder-isolation", "elbow-flexion", "elbow-extension", "elbow-flexion", "elbow-extension"] },
  ],
  4: [
    { name: "Chest & Back", focus: "Upper-chest detail with back width and thickness", patterns: ["horizontal-push", "vertical-pull", "horizontal-push", "horizontal-pull", "vertical-pull", "horizontal-pull"] },
    { name: "Quad-Dominant Legs", focus: "Quad sweep, adductors and calves", patterns: ["squat", "squat", "lunge", "squat", "hip-isolation", "calf-raise"] },
    { name: "Shoulders & Arms", focus: "Three-dimensional delts, biceps and triceps", patterns: ["vertical-push", "shoulder-isolation", "shoulder-isolation", "elbow-flexion", "elbow-extension", "elbow-flexion", "elbow-extension"] },
    { name: "Posterior Chain", focus: "Hamstring density, glutes, back detail and calves", patterns: ["hinge", "knee-flexion", "hinge", "knee-flexion", "horizontal-pull", "calf-raise"] },
  ],
  5: [
    { name: "Chest & Back", focus: "Antagonist upper-body work without rushing", patterns: ["horizontal-push", "vertical-pull", "horizontal-push", "horizontal-pull", "vertical-pull", "horizontal-pull"] },
    { name: "Quads & Calves", focus: "Quad sweep, controlled depth and lower-leg detail", patterns: ["squat", "squat", "lunge", "squat", "calf-raise", "calf-raise"] },
    { name: "Shoulders", focus: "Capped side delts and complete shoulder detail", patterns: ["vertical-push", "shoulder-isolation", "shoulder-isolation", "shoulder-isolation", "vertical-push"] },
    { name: "Back & Arms", focus: "Back width with lengthened-position arm work", patterns: ["vertical-pull", "horizontal-pull", "vertical-pull", "elbow-flexion", "elbow-extension", "elbow-flexion", "elbow-extension"] },
    { name: "Hamstrings & Chest", focus: "Posterior-chain density and a second upper-chest stimulus", patterns: ["hinge", "knee-flexion", "hinge", "knee-flexion", "horizontal-push", "horizontal-push", "calf-raise"] },
  ],
};

const pushPullLegsTemplates: Record<number, DayTemplate[]> = {
  2: [
    { name: "Push", focus: "Chest, shoulders and triceps", patterns: ["horizontal-push", "vertical-push", "horizontal-push", "shoulder-isolation", "elbow-extension", "core"] },
    { name: "Pull & Legs", focus: "Back, biceps and complete lower body", patterns: ["vertical-pull", "horizontal-pull", "squat", "hinge", "knee-flexion", "elbow-flexion", "calf-raise"] },
  ],
  3: [
    { name: "Push", focus: "Chest, shoulders and triceps", patterns: ["horizontal-push", "vertical-push", "horizontal-push", "shoulder-isolation", "elbow-extension", "elbow-extension"] },
    { name: "Pull", focus: "Back, rear delts and biceps", patterns: ["vertical-pull", "horizontal-pull", "vertical-pull", "horizontal-pull", "shoulder-isolation", "elbow-flexion"] },
    { name: "Legs", focus: "Quads, hamstrings, glutes and calves", patterns: ["squat", "hinge", "lunge", "knee-flexion", "hip-isolation", "calf-raise", "core"] },
  ],
  4: [
    { name: "Push", focus: "Chest, shoulders and triceps", patterns: ["horizontal-push", "vertical-push", "horizontal-push", "shoulder-isolation", "elbow-extension", "elbow-extension"] },
    { name: "Pull", focus: "Back, rear delts and biceps", patterns: ["vertical-pull", "horizontal-pull", "vertical-pull", "horizontal-pull", "shoulder-isolation", "elbow-flexion"] },
    { name: "Legs", focus: "Quads, hamstrings, glutes and calves", patterns: ["squat", "hinge", "lunge", "knee-flexion", "hip-isolation", "calf-raise", "core"] },
    { name: "Upper", focus: "Second upper-body growth stimulus", patterns: ["horizontal-push", "horizontal-pull", "vertical-push", "vertical-pull", "shoulder-isolation", "elbow-flexion", "elbow-extension"] },
  ],
  5: templates[5],
};

const upperLowerTemplates: Record<number, DayTemplate[]> = {
  ...templates,
  3: [
    { name: "Upper A", focus: "Horizontal push and pull emphasis", patterns: ["horizontal-push", "horizontal-pull", "vertical-push", "vertical-pull", "shoulder-isolation", "elbow-flexion", "elbow-extension"] },
    { name: "Lower", focus: "Quads, posterior chain and calves", patterns: ["squat", "hinge", "lunge", "knee-flexion", "hip-isolation", "calf-raise", "core"] },
    { name: "Upper B", focus: "Vertical pull and shoulder emphasis", patterns: ["vertical-pull", "vertical-push", "horizontal-push", "horizontal-pull", "shoulder-isolation", "elbow-flexion", "elbow-extension"] },
  ],
};

const fullBodyTemplates: Record<number, DayTemplate[]> = Object.fromEntries([2, 3, 4, 5].map((days) => [days, Array.from({ length: days }, (_, index) => ({
  name: `Full Body ${String.fromCharCode(65 + index)}`,
  focus: "Balanced full-body strength and hypertrophy",
  patterns: index % 2 === 0 ? ["squat", "horizontal-push", "vertical-pull", "hinge", "vertical-push", "horizontal-pull", "core"] : ["hinge", "horizontal-pull", "horizontal-push", "lunge", "vertical-pull", "knee-flexion", "calf-raise"],
}))])) as Record<number, DayTemplate[]>;

const broSplitTemplates: Record<number, DayTemplate[]> = {
  2: [
    { name: "Upper", focus: "Chest, back, delts and arms", patterns: ["horizontal-push", "vertical-pull", "horizontal-pull", "vertical-push", "shoulder-isolation", "elbow-flexion", "elbow-extension"] },
    { name: "Legs", focus: "Quads, hamstrings, glutes and calves", patterns: ["squat", "hinge", "lunge", "knee-flexion", "hip-isolation", "calf-raise", "core"] },
  ],
  3: [
    { name: "Chest & Triceps", focus: "Chest detail, pressing strength and triceps", patterns: ["horizontal-push", "horizontal-push", "vertical-push", "elbow-extension", "elbow-extension", "core"] },
    { name: "Back & Biceps", focus: "Back width, thickness and biceps", patterns: ["vertical-pull", "horizontal-pull", "vertical-pull", "horizontal-pull", "elbow-flexion", "elbow-flexion"] },
    { name: "Legs & Shoulders", focus: "Complete legs with capped delts", patterns: ["squat", "hinge", "lunge", "knee-flexion", "shoulder-isolation", "calf-raise", "hip-isolation"] },
  ],
  4: [
    { name: "Chest", focus: "Upper chest, pressing and triceps", patterns: ["horizontal-push", "horizontal-push", "vertical-push", "elbow-extension", "elbow-extension"] },
    { name: "Back", focus: "Back width, thickness and biceps", patterns: ["vertical-pull", "horizontal-pull", "vertical-pull", "horizontal-pull", "elbow-flexion"] },
    { name: "Legs", focus: "Quads, hamstrings, glutes and calves", patterns: ["squat", "hinge", "lunge", "knee-flexion", "hip-isolation", "calf-raise"] },
    { name: "Shoulders & Arms", focus: "Capped delts and arm detail", patterns: ["vertical-push", "shoulder-isolation", "shoulder-isolation", "elbow-flexion", "elbow-extension", "elbow-flexion"] },
  ],
  5: [
    { name: "Chest", focus: "Upper chest, pressing and triceps", patterns: ["horizontal-push", "horizontal-push", "vertical-push", "elbow-extension", "elbow-extension"] },
    { name: "Back", focus: "Back width and thickness", patterns: ["vertical-pull", "horizontal-pull", "vertical-pull", "horizontal-pull", "shoulder-isolation"] },
    { name: "Legs", focus: "Quads, hamstrings, glutes and calves", patterns: ["squat", "hinge", "lunge", "knee-flexion", "hip-isolation", "calf-raise"] },
    { name: "Shoulders", focus: "Capped delts and controlled pressing", patterns: ["vertical-push", "shoulder-isolation", "shoulder-isolation", "vertical-push", "shoulder-isolation"] },
    { name: "Arms", focus: "Biceps and triceps specialization", patterns: ["elbow-flexion", "elbow-extension", "elbow-flexion", "elbow-extension", "elbow-flexion", "elbow-extension"] },
  ],
};

export function recommendedTrainingSplit(days: number, coachingStyle: CoachingProfile["coachingStyle"]): TrainingSplit {
  if (days === 3) return "push-pull-legs";
  return coachingStyle === "classic-physique" ? "classic-physique" : "upper-lower";
}

export function trainingSplitLabel(split: TrainingSplit): string {
  return TRAINING_SPLIT_OPTIONS.find((option) => option.value === split)?.label ?? "Smart recommendation";
}

export function generateAdaptiveProgram(days: number, profile: CoachingProfile, existing: Workout[]): Workout[] {
  const boundedDays = Math.max(2, Math.min(5, days));
  const classicPhysique = profile.coachingStyle !== "balanced";
  const requestedSplit = profile.trainingSplit ?? "auto";
  const split = requestedSplit === "auto" ? recommendedTrainingSplit(boundedDays, profile.coachingStyle) : requestedSplit;
  const templateSet: Record<TrainingSplit, Record<number, DayTemplate[]>> = {
    auto: templates,
    "push-pull-legs": pushPullLegsTemplates,
    "upper-lower": upperLowerTemplates,
    "full-body": fullBodyTemplates,
    "bro-split": broSplitTemplates,
    "classic-physique": classicPhysiqueTemplates,
  };
  const dayTemplates = templateSet[split][boundedDays];
  const exerciseLimit = Math.max(4, Math.min(9, Math.floor((profile.sessionMinutes - 8) / 7)));
  const known = new Map(existing.flatMap((workout) => workout.exercises.map((exercise) => [exercise.id, exercise])));

  return dayTemplates.map((template, dayIndex) => {
    const chosen = new Set<string>();
    const exercises = template.patterns.slice(0, exerciseLimit).reduce<Exercise[]>((result, pattern, slotIndex) => {
      const definition = selectExercise(pattern, profile, chosen, dayIndex + slotIndex, classicPhysique);
      if (!definition) return result;
      chosen.add(definition.id);
      return [...result, buildExercise(definition, profile.goal, known.get(definition.id), profile.availableEquipment, classicPhysique)];
    }, []);
    return {
      id: `${classicPhysique ? "classic" : "adaptive"}-${boundedDays}-${dayIndex + 1}`,
      title: `Day ${dayIndex + 1} · ${template.name}`,
      focus: `${template.focus} · ${classicPhysique ? "Classic Physique" : formatGoal(profile.goal)}`,
      exercises,
    };
  });
}

export function rotateIsolationExercises(workouts: Workout[], profile: CoachingProfile, records: SessionRecord[] = []): Workout[] {
  const currentIsolationIds = new Set(workouts.flatMap((workout) => workout.exercises.filter((exercise) => definitionFor(exercise)?.modality === "isolation").map((exercise) => exercise.id)));
  const known = new Map<string, Exercise>();
  [...records].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()).forEach((record) => record.exercises.forEach((exercise) => known.set(exercise.id, exercise)));
  workouts.flatMap((workout) => workout.exercises).forEach((exercise) => known.set(exercise.id, exercise));

  return workouts.map((workout, dayIndex) => {
    const chosen = new Set(workout.exercises.filter((exercise) => definitionFor(exercise)?.modality !== "isolation").map((exercise) => exercise.id));
    return {
      ...workout,
      focus: `${workout.focus.replace(/ · Refreshed isolation selection$/, "")} · Refreshed isolation selection`,
      exercises: workout.exercises.map((exercise, slotIndex) => {
        const currentDefinition = definitionFor(exercise);
        if (!currentDefinition || currentDefinition.modality !== "isolation") return exercise;
        const replacement = selectRotatedIsolation(currentDefinition, profile, chosen, currentIsolationIds, dayIndex + slotIndex);
        if (!replacement) return exercise;
        chosen.add(replacement.id);
        return {
          ...buildExercise(replacement, profile.goal, known.get(replacement.id), profile.availableEquipment, profile.coachingStyle !== "balanced"),
          selectionReason: `Six-week rotation: ${replacement.movementPattern.replaceAll("-", " ")} variation for ${replacement.primaryMuscles.join(" and ")}; compound movements remain unchanged.`,
        };
      }),
    };
  });
}

export function isRoutineChangeDue(routineStartedAt: string, now = new Date()): boolean {
  const changeDate = routineChangeDate(routineStartedAt);
  return changeDate !== null && now.getTime() >= changeDate.getTime();
}

export function routineChangeDate(routineStartedAt: string): Date | null {
  const startedAt = new Date(routineStartedAt);
  if (Number.isNaN(startedAt.getTime())) return null;
  const changeDate = new Date(startedAt);
  changeDate.setDate(changeDate.getDate() + 42);
  changeDate.setHours(0, 0, 0, 0);
  const daysUntilMonday = (8 - changeDate.getDay()) % 7;
  changeDate.setDate(changeDate.getDate() + daysUntilMonday);
  return changeDate;
}

export function routineWeek(routineStartedAt: string, now = new Date()): number {
  const startedAt = new Date(routineStartedAt);
  if (Number.isNaN(startedAt.getTime())) return 1;
  return Math.max(1, Math.min(6, Math.floor((now.getTime() - startedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1));
}

function selectRotatedIsolation(current: ExerciseDefinition, profile: CoachingProfile, chosen: Set<string>, currentIsolationIds: Set<string>, rotation: number): ExerciseDefinition | undefined {
  const eligible = (allowExistingRoutineExercise: boolean) => EXERCISE_LIBRARY.filter((exercise) => exercise.modality === "isolation"
    && exercise.id !== current.id
    && !chosen.has(exercise.id)
    && (allowExistingRoutineExercise || !currentIsolationIds.has(exercise.id))
    && exercise.movementPattern === current.movementPattern
    && exercise.primaryMuscles.some((muscle) => current.primaryMuscles.includes(muscle))
    && !profile.excludedExerciseIds.includes(exercise.id)
    && exercise.equipment.some((equipment) => profile.availableEquipment.includes(equipment))
    && difficultyRank[exercise.difficulty] <= difficultyRank[profile.experience]
    && exercise.suitableFor.includes(profile.goal));
  const pool = eligible(false);
  const fallback = pool.length ? pool : eligible(true);
  const ranked = fallback.slice().sort((a, b) => profile.coachingStyle !== "balanced" ? (b.classicPhysiquePriority ?? 0) - (a.classicPhysiquePriority ?? 0) : a.name.localeCompare(b.name));
  return ranked.length ? ranked[rotation % ranked.length] : undefined;
}

function definitionFor(exercise: Pick<Exercise, "id">): ExerciseDefinition | undefined {
  return EXERCISE_LIBRARY.find((definition) => definition.id === exercise.id);
}

function selectExercise(pattern: MovementPattern, profile: CoachingProfile, chosen: Set<string>, rotation: number, classicPhysique: boolean): ExerciseDefinition | undefined {
  const eligible = EXERCISE_LIBRARY.filter((exercise) => exercise.movementPattern === pattern
    && !chosen.has(exercise.id)
    && !profile.excludedExerciseIds.includes(exercise.id)
    && exercise.equipment.some((equipment) => profile.availableEquipment.includes(equipment))
    && difficultyRank[exercise.difficulty] <= difficultyRank[profile.experience]
    && exercise.suitableFor.includes(profile.goal));
  const preferred = eligible.filter((exercise) => profile.preferredExerciseIds.includes(exercise.id));
  const pool = (preferred.length ? preferred : eligible).slice().sort((a, b) => classicPhysique ? (b.classicPhysiquePriority ?? 0) - (a.classicPhysiquePriority ?? 0) : 0);
  if (pool.length) return pool[classicPhysique ? rotation % Math.min(3, pool.length) : rotation % pool.length];
  return EXERCISE_LIBRARY.find((exercise) => !chosen.has(exercise.id)
    && !profile.excludedExerciseIds.includes(exercise.id)
    && exercise.equipment.some((equipment) => profile.availableEquipment.includes(equipment))
    && difficultyRank[exercise.difficulty] <= difficultyRank[profile.experience]);
}

function buildExercise(definition: ExerciseDefinition, goal: TrainingStyle, known: Exercise | undefined, availableEquipment: CoachingProfile["availableEquipment"], classicPhysique: boolean): Exercise {
  const compoundSets: Record<TrainingStyle, number> = { strength: 4, hypertrophy: 4, "general-fitness": 3, "muscular-endurance": 3 };
  const targetSets = definition.modality === "compound" ? compoundSets[goal] : 3;
  const prescribedRange = definition.defaultRepRanges[goal];
  const maximumReps = definition.modality === "compound" ? 10 : 12;
  const repRange: [number, number] = [Math.min(maximumReps, Math.max(6, prescribedRange[0])), Math.min(maximumReps, Math.max(6, prescribedRange[1]))];
  const lastWeight = known?.lastWeight ?? 0;
  const lastReps = Math.min(maximumReps, Math.max(6, known?.lastReps ?? repRange[0]));
  return normalizeExercisePrescription({
    id: definition.id,
    name: definition.name,
    targetSets,
    repRange,
    lastWeight,
    lastReps,
    selectionReason: classicPhysique
      ? `Classic Physique: ${definition.trainingRole?.replaceAll("-", " ")} ${definition.movementPattern.replaceAll("-", " ")} for ${definition.primaryMuscles.join(" and ")}, with ${definition.resistanceProfile} resistance and controlled execution.`
      : `${definition.movementPattern.replaceAll("-", " ")} for ${definition.primaryMuscles.join(" and ")}; matches ${goal.replaceAll("-", " ")} and available ${definition.equipment.filter((item) => availableEquipment.includes(item)).join("/")}.`,
    restSeconds: definition.trainingRole === "heavy-compound" ? 180 : definition.trainingRole === "stable-compound" ? 150 : 90,
    sets: Array.from({ length: targetSets }, (_, index) => ({ weight: known?.sets[index]?.weight ?? lastWeight, reps: Math.min(maximumReps, Math.max(6, known?.sets[index]?.reps ?? lastReps)), completed: false })),
  });
}

function formatGoal(goal: TrainingStyle): string {
  return goal.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
