import { CoachingProfile } from "./coaching";
import { EXERCISE_LIBRARY, ExerciseDefinition, ExperienceLevel, MovementPattern, TrainingStyle } from "./exerciseLibrary";
import { Exercise, Workout } from "./training";

type DayTemplate = { name: string; focus: string; patterns: MovementPattern[] };

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

export function generateAdaptiveProgram(days: number, profile: CoachingProfile, existing: Workout[]): Workout[] {
  const boundedDays = Math.max(2, Math.min(5, days));
  const dayTemplates = templates[boundedDays];
  const exerciseLimit = Math.max(4, Math.min(9, Math.floor((profile.sessionMinutes - 8) / 7)));
  const known = new Map(existing.flatMap((workout) => workout.exercises.map((exercise) => [exercise.id, exercise])));

  return dayTemplates.map((template, dayIndex) => {
    const chosen = new Set<string>();
    const exercises = template.patterns.slice(0, exerciseLimit).map((pattern, slotIndex) => selectExercise(pattern, profile, chosen, dayIndex + slotIndex)).filter((item): item is ExerciseDefinition => Boolean(item)).map((definition) => {
      chosen.add(definition.id);
      return buildExercise(definition, profile.goal, known.get(definition.id), profile.availableEquipment);
    });
    return {
      id: `adaptive-${boundedDays}-${dayIndex + 1}`,
      title: `Day ${dayIndex + 1} · ${template.name}`,
      focus: `${template.focus} · ${formatGoal(profile.goal)}`,
      exercises,
    };
  });
}

function selectExercise(pattern: MovementPattern, profile: CoachingProfile, chosen: Set<string>, rotation: number): ExerciseDefinition | undefined {
  const eligible = EXERCISE_LIBRARY.filter((exercise) => exercise.movementPattern === pattern
    && !chosen.has(exercise.id)
    && !profile.excludedExerciseIds.includes(exercise.id)
    && exercise.equipment.some((equipment) => profile.availableEquipment.includes(equipment))
    && difficultyRank[exercise.difficulty] <= difficultyRank[profile.experience]
    && exercise.suitableFor.includes(profile.goal));
  const preferred = eligible.filter((exercise) => profile.preferredExerciseIds.includes(exercise.id));
  const pool = preferred.length ? preferred : eligible;
  if (pool.length) return pool[rotation % pool.length];
  return EXERCISE_LIBRARY.find((exercise) => !chosen.has(exercise.id)
    && !profile.excludedExerciseIds.includes(exercise.id)
    && exercise.equipment.some((equipment) => profile.availableEquipment.includes(equipment))
    && difficultyRank[exercise.difficulty] <= difficultyRank[profile.experience]);
}

function buildExercise(definition: ExerciseDefinition, goal: TrainingStyle, known: Exercise | undefined, availableEquipment: CoachingProfile["availableEquipment"]): Exercise {
  const compoundSets: Record<TrainingStyle, number> = { strength: 4, hypertrophy: 4, "general-fitness": 3, "muscular-endurance": 3 };
  const isolationSets: Record<TrainingStyle, number> = { strength: 3, hypertrophy: 3, "general-fitness": 2, "muscular-endurance": 2 };
  const targetSets = definition.modality === "compound" ? compoundSets[goal] : isolationSets[goal];
  const repRange = definition.defaultRepRanges[goal];
  const lastWeight = known?.lastWeight ?? 0;
  const lastReps = known?.lastReps ?? repRange[0];
  return {
    id: definition.id,
    name: definition.name,
    targetSets,
    repRange,
    lastWeight,
    lastReps,
    selectionReason: `${definition.movementPattern.replaceAll("-", " ")} for ${definition.primaryMuscles.join(" and ")}; matches ${goal.replaceAll("-", " ")} and available ${definition.equipment.filter((item) => availableEquipment.includes(item)).join("/")}.`,
    sets: Array.from({ length: targetSets }, (_, index) => ({ weight: known?.sets[index]?.weight ?? lastWeight, reps: known?.sets[index]?.reps ?? lastReps, completed: false })),
  };
}

function formatGoal(goal: TrainingStyle): string {
  return goal.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
