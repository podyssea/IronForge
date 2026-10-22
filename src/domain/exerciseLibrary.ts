import { EXERCISE_CATALOG_NAMES } from "./exerciseCatalog";

export type MovementPattern = "horizontal-push" | "vertical-push" | "horizontal-pull" | "vertical-pull" | "squat" | "hinge" | "lunge" | "knee-flexion" | "elbow-flexion" | "elbow-extension" | "shoulder-isolation" | "hip-isolation" | "calf-raise" | "core";
export type MuscleGroup = "chest" | "upper-back" | "lats" | "front-delts" | "side-delts" | "rear-delts" | "biceps" | "triceps" | "forearms" | "quadriceps" | "hamstrings" | "glutes" | "adductors" | "abductors" | "calves" | "core";
export type Equipment = "barbell" | "dumbbell" | "cable" | "machine" | "smith-machine" | "bodyweight" | "resistance-band" | "kettlebell";
export type TrainingStyle = "strength" | "hypertrophy" | "general-fitness" | "muscular-endurance";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type ResistanceProfile = "lengthened" | "mid-range" | "shortened" | "balanced";
export type TrainingRole = "heavy-compound" | "stable-compound" | "isolation" | "finisher";
export type IntensityTechnique = "drop-set" | "rest-pause" | "partials" | "superset" | "top-set-backoff";

export type ExerciseDefinition = {
  id: string;
  name: string;
  movementPattern: MovementPattern;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  difficulty: ExperienceLevel;
  modality: "compound" | "isolation";
  suitableFor: TrainingStyle[];
  unilateral: boolean;
  defaultRepRanges: Record<TrainingStyle, [number, number]>;
  substitutions: string[];
  resistanceProfile?: ResistanceProfile;
  trainingRole?: TrainingRole;
  intensityTechniques?: IntensityTechnique[];
  classicPhysiquePriority?: number;
};

type DefinitionOptions = {
  secondary?: MuscleGroup[];
  unilateral?: boolean;
  substitutions?: string[];
  resistanceProfile?: ResistanceProfile;
  trainingRole?: TrainingRole;
  intensityTechniques?: IntensityTechnique[];
  classicPhysiquePriority?: number;
};

function defineExercise(id: string, name: string, movementPattern: MovementPattern, primaryMuscles: MuscleGroup[], equipment: Equipment[], difficulty: ExperienceLevel, modality: "compound" | "isolation", options: DefinitionOptions = {}): ExerciseDefinition {
  return {
    id, name, movementPattern, primaryMuscles, equipment, difficulty, modality,
    secondaryMuscles: options.secondary ?? [],
    unilateral: options.unilateral ?? false,
    suitableFor: ["strength", "hypertrophy", "general-fitness", "muscular-endurance"],
    defaultRepRanges: modality === "compound" ? { strength: [3, 6], hypertrophy: [6, 12], "general-fitness": [6, 12], "muscular-endurance": [12, 20] } : { strength: [6, 10], hypertrophy: [10, 15], "general-fitness": [10, 15], "muscular-endurance": [15, 25] },
    substitutions: options.substitutions ?? [],
    resistanceProfile: options.resistanceProfile ?? "balanced",
    trainingRole: options.trainingRole ?? (modality === "compound" ? "heavy-compound" : "isolation"),
    intensityTechniques: options.intensityTechniques ?? (modality === "isolation" ? ["drop-set", "superset"] : ["top-set-backoff"]),
    classicPhysiquePriority: options.classicPhysiquePriority ?? 0,
  };
}

const CURATED_EXERCISE_LIBRARY: ExerciseDefinition[] = [
  defineExercise("barbell-bench", "Barbell Bench Press", "horizontal-push", ["chest"], ["barbell"], "intermediate", "compound", { secondary: ["front-delts", "triceps"], substitutions: ["dumbbell-bench", "machine-chest"] }),
  defineExercise("dumbbell-bench", "Dumbbell Bench Press", "horizontal-push", ["chest"], ["dumbbell"], "beginner", "compound", { secondary: ["front-delts", "triceps"], substitutions: ["barbell-bench", "machine-chest"] }),
  defineExercise("incline-smith", "Incline Smith Press", "horizontal-push", ["chest"], ["smith-machine"], "beginner", "compound", { secondary: ["front-delts", "triceps"], substitutions: ["incline-dumbbell", "incline-machine"] }),
  defineExercise("incline-dumbbell", "Incline Dumbbell Press", "horizontal-push", ["chest"], ["dumbbell"], "intermediate", "compound", { secondary: ["front-delts", "triceps"], substitutions: ["incline-smith", "incline-machine"] }),
  defineExercise("incline-machine", "Incline Chest Press Machine", "horizontal-push", ["chest"], ["machine"], "beginner", "compound", { secondary: ["front-delts", "triceps"], substitutions: ["incline-smith", "incline-dumbbell"] }),
  defineExercise("machine-chest", "Machine Chest Press", "horizontal-push", ["chest"], ["machine"], "beginner", "compound", { secondary: ["front-delts", "triceps"], substitutions: ["barbell-bench", "dumbbell-bench"] }),
  defineExercise("push-up", "Push-Up", "horizontal-push", ["chest"], ["bodyweight"], "beginner", "compound", { secondary: ["front-delts", "triceps", "core"], substitutions: ["machine-chest", "band-chest-press"] }),
  defineExercise("band-chest-press", "Resistance Band Chest Press", "horizontal-push", ["chest"], ["resistance-band"], "beginner", "compound", { secondary: ["front-delts", "triceps"], substitutions: ["push-up", "machine-chest"] }),
  defineExercise("pec-deck", "Pec Deck Fly", "horizontal-push", ["chest"], ["machine"], "beginner", "isolation", { substitutions: ["cable-fly", "dumbbell-fly"] }),
  defineExercise("cable-fly", "Cable Chest Fly", "horizontal-push", ["chest"], ["cable"], "beginner", "isolation", { substitutions: ["pec-deck", "dumbbell-fly"] }),
  defineExercise("dumbbell-fly", "Dumbbell Fly", "horizontal-push", ["chest"], ["dumbbell"], "intermediate", "isolation", { substitutions: ["pec-deck", "cable-fly"] }),

  defineExercise("pull-ups", "Weighted Pull-Ups", "vertical-pull", ["lats"], ["bodyweight"], "advanced", "compound", { secondary: ["upper-back", "biceps"], substitutions: ["pull-up", "lat-pulldown"] }),
  defineExercise("pull-up", "Pull-Up", "vertical-pull", ["lats"], ["bodyweight"], "intermediate", "compound", { secondary: ["upper-back", "biceps"], substitutions: ["assisted-pull-up", "lat-pulldown"] }),
  defineExercise("assisted-pull-up", "Assisted Pull-Up", "vertical-pull", ["lats"], ["machine", "resistance-band"], "beginner", "compound", { secondary: ["upper-back", "biceps"], substitutions: ["pull-up", "lat-pulldown"] }),
  defineExercise("lat-pulldown", "Lat Pulldown", "vertical-pull", ["lats"], ["cable", "machine"], "beginner", "compound", { secondary: ["upper-back", "biceps"], substitutions: ["pull-up", "single-arm-pulldown"] }),
  defineExercise("single-arm-pulldown", "Single-Arm Lat Pulldown", "vertical-pull", ["lats"], ["cable"], "beginner", "compound", { secondary: ["biceps"], unilateral: true, substitutions: ["lat-pulldown", "pullover"] }),
  defineExercise("pullover", "Lat Pullover", "vertical-pull", ["lats"], ["cable", "machine"], "beginner", "isolation", { substitutions: ["straight-arm-pulldown", "single-arm-pulldown"] }),
  defineExercise("straight-arm-pulldown", "Straight-Arm Pulldown", "vertical-pull", ["lats"], ["cable"], "beginner", "isolation", { substitutions: ["pullover"] }),
  defineExercise("barbell-row", "Barbell Row", "horizontal-pull", ["upper-back"], ["barbell"], "advanced", "compound", { secondary: ["lats", "biceps", "core"], substitutions: ["tbar-row", "seated-cable-row"] }),
  defineExercise("tbar-row", "Chest-Supported T-Bar Row", "horizontal-pull", ["upper-back"], ["machine", "barbell"], "intermediate", "compound", { secondary: ["lats", "biceps"], substitutions: ["chest-supported-row", "seated-cable-row"] }),
  defineExercise("chest-supported-row", "Chest-Supported Dumbbell Row", "horizontal-pull", ["upper-back"], ["dumbbell"], "beginner", "compound", { secondary: ["lats", "biceps"], substitutions: ["tbar-row", "seated-cable-row"] }),
  defineExercise("seated-cable-row", "Seated Cable Row", "horizontal-pull", ["upper-back"], ["cable"], "beginner", "compound", { secondary: ["lats", "biceps"], substitutions: ["tbar-row", "machine-row"] }),
  defineExercise("machine-row", "Machine Row", "horizontal-pull", ["upper-back"], ["machine"], "beginner", "compound", { secondary: ["lats", "biceps"], substitutions: ["seated-cable-row", "chest-supported-row"] }),
  defineExercise("single-arm-row", "Single Arm Row", "horizontal-pull", ["lats"], ["dumbbell", "cable"], "beginner", "compound", { secondary: ["upper-back", "biceps"], unilateral: true, substitutions: ["machine-row", "seated-cable-row"] }),
  defineExercise("inverted-row", "Inverted Row", "horizontal-pull", ["upper-back"], ["bodyweight"], "beginner", "compound", { secondary: ["lats", "biceps", "core"], substitutions: ["seated-cable-row", "band-row"] }),
  defineExercise("band-row", "Resistance Band Row", "horizontal-pull", ["upper-back"], ["resistance-band"], "beginner", "compound", { secondary: ["lats", "biceps"], substitutions: ["inverted-row", "seated-cable-row"] }),

  defineExercise("overhead-press", "Barbell Overhead Press", "vertical-push", ["front-delts"], ["barbell"], "intermediate", "compound", { secondary: ["side-delts", "triceps", "core"], substitutions: ["dumbbell-shoulder-press", "shoulder-press"] }),
  defineExercise("dumbbell-shoulder-press", "Dumbbell Shoulder Press", "vertical-push", ["front-delts"], ["dumbbell"], "beginner", "compound", { secondary: ["side-delts", "triceps"], substitutions: ["overhead-press", "shoulder-press"] }),
  defineExercise("shoulder-press", "Shoulder Press", "vertical-push", ["front-delts"], ["machine"], "beginner", "compound", { secondary: ["side-delts", "triceps"], substitutions: ["dumbbell-shoulder-press", "overhead-press"] }),
  defineExercise("arnold-press", "Arnold Press", "vertical-push", ["front-delts"], ["dumbbell"], "intermediate", "compound", { secondary: ["side-delts", "triceps"], substitutions: ["dumbbell-shoulder-press"] }),
  defineExercise("lateral-raise", "Cable Lateral Raise", "shoulder-isolation", ["side-delts"], ["cable"], "beginner", "isolation", { unilateral: true, substitutions: ["dumbbell-lateral-raise", "machine-lateral-raise"] }),
  defineExercise("dumbbell-lateral-raise", "Dumbbell Lateral Raise", "shoulder-isolation", ["side-delts"], ["dumbbell"], "beginner", "isolation", { substitutions: ["lateral-raise", "machine-lateral-raise"] }),
  defineExercise("machine-lateral-raise", "Machine Lateral Raise", "shoulder-isolation", ["side-delts"], ["machine"], "beginner", "isolation", { substitutions: ["lateral-raise", "dumbbell-lateral-raise"] }),
  defineExercise("rear-delt", "Rear Delt Fly", "shoulder-isolation", ["rear-delts"], ["machine", "dumbbell"], "beginner", "isolation", { secondary: ["upper-back"], substitutions: ["face-pull", "cable-rear-delt"] }),
  defineExercise("face-pull", "Face Pull", "shoulder-isolation", ["rear-delts"], ["cable", "resistance-band"], "beginner", "isolation", { secondary: ["upper-back"], substitutions: ["rear-delt", "cable-rear-delt"] }),
  defineExercise("cable-rear-delt", "Cable Rear Delt Fly", "shoulder-isolation", ["rear-delts"], ["cable"], "beginner", "isolation", { substitutions: ["rear-delt", "face-pull"] }),

  defineExercise("back-squat", "Barbell Back Squat", "squat", ["quadriceps", "glutes"], ["barbell"], "advanced", "compound", { secondary: ["adductors", "core"], substitutions: ["front-squat", "hack-squat"] }),
  defineExercise("front-squat", "Front Squat", "squat", ["quadriceps"], ["barbell"], "advanced", "compound", { secondary: ["glutes", "core"], substitutions: ["back-squat", "goblet-squat"] }),
  defineExercise("goblet-squat", "Goblet Squat", "squat", ["quadriceps", "glutes"], ["dumbbell", "kettlebell"], "beginner", "compound", { secondary: ["core"], substitutions: ["front-squat", "leg-press"] }),
  defineExercise("hack-squat", "Hack Squat", "squat", ["quadriceps"], ["machine"], "beginner", "compound", { secondary: ["glutes"], substitutions: ["leg-press", "back-squat"] }),
  defineExercise("leg-press", "Leg Press", "squat", ["quadriceps"], ["machine"], "beginner", "compound", { secondary: ["glutes", "adductors"], substitutions: ["hack-squat", "panatta"] }),
  defineExercise("panatta", "Panatta Press", "squat", ["quadriceps"], ["machine"], "beginner", "compound", { secondary: ["glutes"], substitutions: ["leg-press", "hack-squat"] }),
  defineExercise("leg-extension", "Leg Extension", "squat", ["quadriceps"], ["machine"], "beginner", "isolation", { substitutions: ["band-leg-extension"] }),
  defineExercise("band-leg-extension", "Band Leg Extension", "squat", ["quadriceps"], ["resistance-band"], "beginner", "isolation", { substitutions: ["leg-extension"] }),
  defineExercise("rdl", "RDL", "hinge", ["hamstrings", "glutes"], ["barbell", "dumbbell"], "intermediate", "compound", { secondary: ["core"], substitutions: ["dumbbell-rdl", "good-morning"] }),
  defineExercise("dumbbell-rdl", "Dumbbell Romanian Deadlift", "hinge", ["hamstrings", "glutes"], ["dumbbell"], "beginner", "compound", { secondary: ["core"], substitutions: ["rdl", "kettlebell-deadlift"] }),
  defineExercise("conventional-deadlift", "Conventional Deadlift", "hinge", ["glutes", "hamstrings"], ["barbell"], "advanced", "compound", { secondary: ["upper-back", "quadriceps", "core"], substitutions: ["trap-bar-deadlift", "kettlebell-deadlift"] }),
  defineExercise("trap-bar-deadlift", "Trap Bar Deadlift", "hinge", ["glutes", "quadriceps"], ["barbell"], "intermediate", "compound", { secondary: ["hamstrings", "upper-back", "core"], substitutions: ["conventional-deadlift", "kettlebell-deadlift"] }),
  defineExercise("kettlebell-deadlift", "Kettlebell Deadlift", "hinge", ["glutes", "hamstrings"], ["kettlebell"], "beginner", "compound", { secondary: ["core"], substitutions: ["dumbbell-rdl", "trap-bar-deadlift"] }),
  defineExercise("hip-thrust", "Hip Thrust", "hinge", ["glutes"], ["barbell", "machine"], "beginner", "compound", { secondary: ["hamstrings"], substitutions: ["glute-bridge"] }),
  defineExercise("glute-bridge", "Glute Bridge", "hinge", ["glutes"], ["bodyweight", "resistance-band"], "beginner", "compound", { secondary: ["hamstrings"], substitutions: ["hip-thrust"] }),
  defineExercise("good-morning", "Good Morning", "hinge", ["hamstrings", "glutes"], ["barbell"], "advanced", "compound", { secondary: ["core"], substitutions: ["rdl"] }),
  defineExercise("walking-lunges", "Walking Lunges", "lunge", ["quadriceps", "glutes"], ["dumbbell", "bodyweight"], "intermediate", "compound", { unilateral: true, substitutions: ["reverse-lunge", "split-squat"] }),
  defineExercise("reverse-lunge", "Reverse Lunge", "lunge", ["quadriceps", "glutes"], ["dumbbell", "bodyweight"], "beginner", "compound", { unilateral: true, substitutions: ["walking-lunges", "split-squat"] }),
  defineExercise("split-squat", "Bulgarian Split Squat", "lunge", ["quadriceps", "glutes"], ["dumbbell", "bodyweight"], "intermediate", "compound", { unilateral: true, substitutions: ["reverse-lunge", "step-up"] }),
  defineExercise("step-up", "Step-Up", "lunge", ["quadriceps", "glutes"], ["dumbbell", "bodyweight"], "beginner", "compound", { unilateral: true, substitutions: ["split-squat", "reverse-lunge"] }),
  defineExercise("seated-leg-curl", "Seated Leg Curl", "knee-flexion", ["hamstrings"], ["machine"], "beginner", "isolation", { substitutions: ["lying-curl", "band-leg-curl"] }),
  defineExercise("lying-curl", "Lying Leg Curl", "knee-flexion", ["hamstrings"], ["machine"], "beginner", "isolation", { substitutions: ["seated-leg-curl", "band-leg-curl"] }),
  defineExercise("band-leg-curl", "Band Leg Curl", "knee-flexion", ["hamstrings"], ["resistance-band"], "beginner", "isolation", { substitutions: ["seated-leg-curl", "lying-curl"] }),
  defineExercise("adductor", "Adductor Machine", "hip-isolation", ["adductors"], ["machine"], "beginner", "isolation", { substitutions: ["cable-adduction"] }),
  defineExercise("cable-adduction", "Cable Hip Adduction", "hip-isolation", ["adductors"], ["cable"], "beginner", "isolation", { unilateral: true, substitutions: ["adductor"] }),
  defineExercise("abductors", "Abductors Machine", "hip-isolation", ["abductors", "glutes"], ["machine"], "beginner", "isolation", { substitutions: ["band-abduction"] }),
  defineExercise("band-abduction", "Band Hip Abduction", "hip-isolation", ["abductors", "glutes"], ["resistance-band"], "beginner", "isolation", { substitutions: ["abductors"] }),

  defineExercise("standing-calf", "Standing Calf Raise", "calf-raise", ["calves"], ["machine", "dumbbell"], "beginner", "isolation", { substitutions: ["seated-calf", "single-leg-calf"] }),
  defineExercise("seated-calf", "Seated Calf Raise", "calf-raise", ["calves"], ["machine"], "beginner", "isolation", { substitutions: ["standing-calf", "single-leg-calf"] }),
  defineExercise("single-leg-calf", "Single-Leg Calf Raise", "calf-raise", ["calves"], ["bodyweight", "dumbbell"], "beginner", "isolation", { unilateral: true, substitutions: ["standing-calf", "seated-calf"] }),

  defineExercise("barbell-curl", "Barbell Curl", "elbow-flexion", ["biceps"], ["barbell"], "beginner", "isolation", { secondary: ["forearms"], substitutions: ["dumbbell-curl", "preacher-curl"] }),
  defineExercise("ez-bar-curl", "EZ-Bar Curl", "elbow-flexion", ["biceps"], ["barbell"], "beginner", "isolation", { secondary: ["forearms"], substitutions: ["barbell-curl", "preacher-curl"] }),
  defineExercise("dumbbell-curl", "Dumbbell Curl", "elbow-flexion", ["biceps"], ["dumbbell"], "beginner", "isolation", { secondary: ["forearms"], substitutions: ["barbell-curl", "cable-curl"] }),
  defineExercise("incline-dumbbell-curl", "Incline Dumbbell Curl", "elbow-flexion", ["biceps"], ["dumbbell"], "intermediate", "isolation", { secondary: ["forearms"], substitutions: ["dumbbell-curl", "preacher-curl"], resistanceProfile: "lengthened" }),
  defineExercise("cable-curl", "Cable Curl", "elbow-flexion", ["biceps"], ["cable"], "beginner", "isolation", { substitutions: ["dumbbell-curl", "preacher-curl"] }),
  defineExercise("preacher-curl", "Unilateral Preacher Curl", "elbow-flexion", ["biceps"], ["machine", "dumbbell"], "beginner", "isolation", { unilateral: true, substitutions: ["cable-curl", "barbell-curl"] }),
  defineExercise("hammer-curl", "Unilateral Hammer Curl", "elbow-flexion", ["biceps", "forearms"], ["dumbbell", "cable"], "beginner", "isolation", { unilateral: true, substitutions: ["dumbbell-curl", "cable-curl"] }),
  defineExercise("pushdown", "Cambered Bar Pushdown", "elbow-extension", ["triceps"], ["cable"], "beginner", "isolation", { substitutions: ["rope-pushdown", "overhead-extension"] }),
  defineExercise("rope-pushdown", "Rope Pushdown", "elbow-extension", ["triceps"], ["cable"], "beginner", "isolation", { substitutions: ["pushdown", "overhead-extension"] }),
  defineExercise("overhead-extension", "Laying Overhead DB Extension", "elbow-extension", ["triceps"], ["dumbbell"], "intermediate", "isolation", { substitutions: ["cable-overhead-extension", "pushdown"] }),
  defineExercise("cable-overhead-extension", "Cable Overhead Triceps Extension", "elbow-extension", ["triceps"], ["cable"], "beginner", "isolation", { substitutions: ["overhead-extension", "rope-pushdown"] }),
  defineExercise("close-grip-bench", "Close-Grip Bench Press", "elbow-extension", ["triceps"], ["barbell"], "intermediate", "compound", { secondary: ["chest", "front-delts"], substitutions: ["dip", "pushdown"] }),
  defineExercise("dip", "Dip", "elbow-extension", ["triceps", "chest"], ["bodyweight"], "intermediate", "compound", { secondary: ["front-delts"], substitutions: ["close-grip-bench", "push-up"] }),

  defineExercise("plank", "Plank", "core", ["core"], ["bodyweight"], "beginner", "isolation", { substitutions: ["dead-bug", "pallof-press"] }),
  defineExercise("dead-bug", "Dead Bug", "core", ["core"], ["bodyweight"], "beginner", "isolation", { substitutions: ["plank", "pallof-press"] }),
  defineExercise("pallof-press", "Pallof Press", "core", ["core"], ["cable", "resistance-band"], "beginner", "isolation", { substitutions: ["plank", "dead-bug"] }),
  defineExercise("cable-crunch", "Cable Crunch", "core", ["core"], ["cable"], "beginner", "isolation", { substitutions: ["machine-crunch"] }),
  defineExercise("machine-crunch", "Machine Crunch", "core", ["core"], ["machine"], "beginner", "isolation", { substitutions: ["cable-crunch"] }),
  defineExercise("hanging-leg-raise", "Hanging Leg Raise", "core", ["core"], ["bodyweight"], "intermediate", "isolation", { substitutions: ["cable-crunch", "machine-crunch"] }),

  defineExercise("converging-chest-press", "Converging Chest Press", "horizontal-push", ["chest"], ["machine"], "intermediate", "compound", { secondary: ["front-delts", "triceps"], substitutions: ["machine-chest", "dumbbell-bench"], trainingRole: "stable-compound", resistanceProfile: "balanced", classicPhysiquePriority: 5 }),
  defineExercise("incline-cable-fly", "Low-to-High Incline Cable Fly", "horizontal-push", ["chest"], ["cable"], "intermediate", "isolation", { substitutions: ["cable-fly", "incline-machine"], resistanceProfile: "shortened", classicPhysiquePriority: 5 }),
  defineExercise("stretch-push-up", "Deep-Stretch Push-Up", "horizontal-push", ["chest"], ["bodyweight"], "intermediate", "compound", { secondary: ["front-delts", "triceps"], substitutions: ["push-up", "dumbbell-bench"], resistanceProfile: "lengthened", trainingRole: "finisher", intensityTechniques: ["partials", "superset"], classicPhysiquePriority: 3 }),
  defineExercise("machine-high-row", "Chest-Supported Machine High Row", "horizontal-pull", ["upper-back"], ["machine"], "intermediate", "compound", { secondary: ["lats", "rear-delts", "biceps"], substitutions: ["tbar-row", "machine-row"], trainingRole: "stable-compound", classicPhysiquePriority: 5 }),
  defineExercise("iliac-pulldown", "Single-Arm Iliac Lat Pulldown", "vertical-pull", ["lats"], ["cable"], "intermediate", "isolation", { secondary: ["biceps"], unilateral: true, substitutions: ["single-arm-pulldown", "pullover"], resistanceProfile: "shortened", classicPhysiquePriority: 5 }),
  defineExercise("kneeling-pulldown", "Kneeling Neutral-Grip Pulldown", "vertical-pull", ["lats"], ["cable"], "intermediate", "compound", { secondary: ["upper-back", "biceps"], substitutions: ["lat-pulldown", "single-arm-pulldown"], trainingRole: "stable-compound", classicPhysiquePriority: 4 }),
  defineExercise("kelso-shrug", "Chest-Supported Kelso Shrug", "horizontal-pull", ["upper-back"], ["barbell", "dumbbell", "machine"], "advanced", "isolation", { secondary: ["rear-delts"], substitutions: ["machine-high-row", "tbar-row"], resistanceProfile: "shortened", classicPhysiquePriority: 4 }),
  defineExercise("cable-y-raise", "Cable Y-Raise", "shoulder-isolation", ["side-delts", "rear-delts"], ["cable"], "intermediate", "isolation", { substitutions: ["lateral-raise", "face-pull"], resistanceProfile: "lengthened", classicPhysiquePriority: 5 }),
  defineExercise("leaning-lateral-raise", "Leaning Cable Lateral Raise", "shoulder-isolation", ["side-delts"], ["cable"], "intermediate", "isolation", { unilateral: true, substitutions: ["lateral-raise", "machine-lateral-raise"], resistanceProfile: "lengthened", classicPhysiquePriority: 5 }),
  defineExercise("reverse-pec-deck", "Reverse Pec Deck", "shoulder-isolation", ["rear-delts"], ["machine"], "beginner", "isolation", { secondary: ["upper-back"], substitutions: ["rear-delt", "face-pull"], resistanceProfile: "shortened", classicPhysiquePriority: 5 }),
  defineExercise("pendulum-squat", "Pendulum Squat", "squat", ["quadriceps"], ["machine"], "advanced", "compound", { secondary: ["glutes", "adductors"], substitutions: ["hack-squat", "leg-press"], resistanceProfile: "lengthened", trainingRole: "stable-compound", classicPhysiquePriority: 5 }),
  defineExercise("belt-squat", "Belt Squat", "squat", ["quadriceps", "glutes"], ["machine"], "intermediate", "compound", { substitutions: ["hack-squat", "goblet-squat"], resistanceProfile: "lengthened", trainingRole: "stable-compound", classicPhysiquePriority: 4 }),
  defineExercise("sissy-squat", "Assisted Sissy Squat", "squat", ["quadriceps"], ["bodyweight", "machine"], "advanced", "isolation", { substitutions: ["leg-extension", "split-squat"], resistanceProfile: "lengthened", trainingRole: "finisher", intensityTechniques: ["partials", "superset"], classicPhysiquePriority: 4 }),
  defineExercise("single-leg-extension", "Single-Leg Extension", "squat", ["quadriceps"], ["machine"], "intermediate", "isolation", { unilateral: true, substitutions: ["leg-extension", "sissy-squat"], resistanceProfile: "shortened", classicPhysiquePriority: 4 }),
  defineExercise("stiff-leg-deadlift", "Stiff-Leg Deadlift", "hinge", ["hamstrings", "glutes"], ["barbell", "dumbbell"], "advanced", "compound", { secondary: ["core"], substitutions: ["rdl", "dumbbell-rdl"], resistanceProfile: "lengthened", classicPhysiquePriority: 5 }),
  defineExercise("glute-ham-raise", "Glute-Ham Raise", "knee-flexion", ["hamstrings", "glutes"], ["machine", "bodyweight"], "advanced", "compound", { substitutions: ["nordic-curl", "lying-curl"], resistanceProfile: "lengthened", classicPhysiquePriority: 5 }),
  defineExercise("nordic-curl", "Nordic Hamstring Curl", "knee-flexion", ["hamstrings"], ["bodyweight"], "advanced", "compound", { substitutions: ["glute-ham-raise", "lying-curl"], resistanceProfile: "lengthened", classicPhysiquePriority: 4 }),
  defineExercise("back-extension-45", "45-Degree Back Extension", "hinge", ["hamstrings", "glutes"], ["bodyweight", "dumbbell"], "intermediate", "compound", { secondary: ["core"], substitutions: ["dumbbell-rdl", "glute-bridge"], resistanceProfile: "lengthened", trainingRole: "finisher", classicPhysiquePriority: 4 }),
  defineExercise("bayesian-curl", "Bayesian Cable Curl", "elbow-flexion", ["biceps"], ["cable"], "intermediate", "isolation", { unilateral: true, substitutions: ["cable-curl", "dumbbell-curl"], resistanceProfile: "lengthened", classicPhysiquePriority: 5 }),
  defineExercise("spider-curl", "Spider Curl", "elbow-flexion", ["biceps"], ["barbell", "dumbbell"], "intermediate", "isolation", { substitutions: ["preacher-curl", "dumbbell-curl"], resistanceProfile: "shortened", classicPhysiquePriority: 4 }),
  defineExercise("cross-body-extension", "Cross-Body Cable Triceps Extension", "elbow-extension", ["triceps"], ["cable"], "intermediate", "isolation", { unilateral: true, substitutions: ["pushdown", "cable-overhead-extension"], resistanceProfile: "shortened", classicPhysiquePriority: 5 }),
  defineExercise("jm-press", "Smith Machine JM Press", "elbow-extension", ["triceps"], ["smith-machine"], "advanced", "compound", { secondary: ["chest", "front-delts"], substitutions: ["close-grip-bench", "pushdown"], resistanceProfile: "lengthened", classicPhysiquePriority: 4 }),
  defineExercise("donkey-calf", "Donkey Calf Raise", "calf-raise", ["calves"], ["machine", "bodyweight"], "intermediate", "isolation", { substitutions: ["standing-calf", "seated-calf"], resistanceProfile: "lengthened", classicPhysiquePriority: 4 }),
  defineExercise("tibialis-raise", "Tibialis Raise", "calf-raise", ["calves"], ["machine", "bodyweight"], "beginner", "isolation", { substitutions: ["standing-calf", "single-leg-calf"], trainingRole: "finisher", classicPhysiquePriority: 3 }),
];

const LEGACY_ID_BY_CATALOG_NAME: Record<string, string> = {
  "Flat Dumbbell Bench Press": "dumbbell-bench",
  "Smith Machine Bench Press": "incline-smith",
  "Incline Machine Chest Press": "incline-machine",
  "Standard Push-Up": "push-up",
  "Weighted Pull-Up": "pull-ups",
  "Machine Shoulder Press": "shoulder-press",
  "Seated Rear Delt Raise": "rear-delt",
  "Barbell Romanian Deadlift": "rdl",
  "Dumbbell Walking Lunge": "walking-lunges",
  "Hip Abduction Machine": "abductors",
  "Preacher Curl": "preacher-curl",
  "Straight-Bar Pushdown": "pushdown",
  "Seated Dumbbell Overhead Extension": "overhead-extension",
};

const CATALOG_ID_OVERRIDES: Record<string, string> = {
  "Sissy Squat": "bodyweight-sissy-squat",
  "Split Squat": "standard-split-squat",
  "Nordic Curl": "bodyweight-nordic-curl",
};

const curatedByName = new Map(CURATED_EXERCISE_LIBRARY.map((exercise) => [exercise.name.toLowerCase(), exercise]));
const curatedById = new Map(CURATED_EXERCISE_LIBRARY.map((exercise) => [exercise.id, exercise]));

export function getExerciseDefinition(id: string): ExerciseDefinition | undefined {
  return exerciseById.get(id);
}

export function getExerciseSubstitutions(id: string, equipment?: Equipment[]): ExerciseDefinition[] {
  const definition = getExerciseDefinition(id);
  if (!definition) return [];
  return definition.substitutions.map(getExerciseDefinition).filter((item): item is ExerciseDefinition => Boolean(item)).filter((item) => !equipment || item.equipment.some((option) => equipment.includes(option)));
}

export function filterExerciseLibrary(filters: { equipment?: Equipment[]; muscle?: MuscleGroup; movementPattern?: MovementPattern; style?: TrainingStyle; maximumDifficulty?: ExperienceLevel }): ExerciseDefinition[] {
  const difficultyRank: Record<ExperienceLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 };
  return EXERCISE_LIBRARY.filter((exercise) => (!filters.equipment || exercise.equipment.some((item) => filters.equipment?.includes(item)))
    && (!filters.muscle || exercise.primaryMuscles.includes(filters.muscle))
    && (!filters.movementPattern || exercise.movementPattern === filters.movementPattern)
    && (!filters.style || exercise.suitableFor.includes(filters.style))
    && (!filters.maximumDifficulty || difficultyRank[exercise.difficulty] <= difficultyRank[filters.maximumDifficulty]));
}

type CatalogSection = {
  start: string;
  movementPattern: MovementPattern;
  primaryMuscles: MuscleGroup[];
  modality: "compound" | "isolation";
};

const CATALOG_SECTIONS: CatalogSection[] = [
  { start: "Barbell Bench Press", movementPattern: "horizontal-push", primaryMuscles: ["chest"], modality: "compound" },
  { start: "Pull-Up", movementPattern: "vertical-pull", primaryMuscles: ["lats", "upper-back"], modality: "compound" },
  { start: "Standing Barbell Overhead Press", movementPattern: "vertical-push", primaryMuscles: ["front-delts", "side-delts"], modality: "compound" },
  { start: "Barbell Curl", movementPattern: "elbow-flexion", primaryMuscles: ["biceps"], modality: "isolation" },
  { start: "Cable Triceps Pushdown", movementPattern: "elbow-extension", primaryMuscles: ["triceps"], modality: "isolation" },
  { start: "Bodyweight Squat", movementPattern: "squat", primaryMuscles: ["quadriceps", "glutes"], modality: "compound" },
  { start: "Seated Leg Curl", movementPattern: "knee-flexion", primaryMuscles: ["hamstrings"], modality: "isolation" },
  { start: "Glute Bridge", movementPattern: "hip-isolation", primaryMuscles: ["glutes"], modality: "isolation" },
  { start: "Standing Calf Raise", movementPattern: "calf-raise", primaryMuscles: ["calves"], modality: "isolation" },
  { start: "Crunch", movementPattern: "core", primaryMuscles: ["core"], modality: "isolation" },
  { start: "Dumbbell Shrug", movementPattern: "horizontal-pull", primaryMuscles: ["upper-back"], modality: "isolation" },
  { start: "Wrist Curl", movementPattern: "elbow-flexion", primaryMuscles: ["forearms"], modality: "isolation" },
  { start: "Neck Flexion", movementPattern: "core", primaryMuscles: ["core"], modality: "isolation" },
  { start: "Conventional Deadlift", movementPattern: "hinge", primaryMuscles: ["glutes", "hamstrings", "core"], modality: "compound" },
  { start: "Sled Push", movementPattern: "lunge", primaryMuscles: ["quadriceps", "glutes", "core"], modality: "compound" },
  { start: "Clean", movementPattern: "hinge", primaryMuscles: ["glutes", "hamstrings", "quadriceps"], modality: "compound" },
  { start: "Dip", movementPattern: "horizontal-push", primaryMuscles: ["chest", "triceps"], modality: "compound" },
  { start: "Kettlebell Deadlift", movementPattern: "hinge", primaryMuscles: ["glutes", "hamstrings", "core"], modality: "compound" },
  { start: "Dumbbell Snatch", movementPattern: "hinge", primaryMuscles: ["glutes", "hamstrings", "front-delts"], modality: "compound" },
  { start: "Treadmill Walking", movementPattern: "lunge", primaryMuscles: ["quadriceps", "glutes", "core"], modality: "compound" },
  { start: "Squat Jump", movementPattern: "squat", primaryMuscles: ["quadriceps", "glutes"], modality: "compound" },
  { start: "Cat-Cow", movementPattern: "core", primaryMuscles: ["core"], modality: "isolation" },
  { start: "Band External Rotation", movementPattern: "shoulder-isolation", primaryMuscles: ["rear-delts"], modality: "isolation" },
  { start: "Mountain Pose", movementPattern: "core", primaryMuscles: ["core"], modality: "isolation" },
  { start: "Pilates Hundred", movementPattern: "core", primaryMuscles: ["core"], modality: "isolation" },
];

const catalogSectionStarts = CATALOG_SECTIONS.map((section) => EXERCISE_CATALOG_NAMES.indexOf(section.start));

function inferExerciseDefinition(name: string, catalogIndex: number): ExerciseDefinition {
  const lower = name.toLowerCase();
  let section = CATALOG_SECTIONS[0];
  catalogSectionStarts.forEach((start, index) => { if (catalogIndex >= start) section = CATALOG_SECTIONS[index]; });
  const movementPattern = inferMovementPattern(lower, section.movementPattern);
  const modality = inferModality(lower, section.modality);
  const difficulty = inferDifficulty(lower);
  const equipment = inferEquipment(lower);
  return defineExercise(CATALOG_ID_OVERRIDES[name] ?? slugifyExerciseName(name), name, movementPattern, section.primaryMuscles, equipment, difficulty, modality, {
    unilateral: /single|one-arm|one-leg|alternating|meadows|archer|suitcase|curtsy|split squat|lunge|step-up/.test(lower),
  });
}

function inferMovementPattern(name: string, fallback: MovementPattern): MovementPattern {
  if (/pulldown|pull-up|chin-up|muscle-up|pullover|front lever/.test(name)) return "vertical-pull";
  if (/row|shrug|pull-apart|retraction|reverse fly|rear delt|face pull|high pull|clean pull/.test(name)) return "horizontal-pull";
  if (/shoulder press|overhead press|arnold|landmine press|bradford|push press|jerk|handstand|pike push-up|z press/.test(name)) return "vertical-push";
  if (/lateral raise|front raise|rear delt|pec deck|shoulder|upright row|y raise|t raise/.test(name)) return "shoulder-isolation";
  if (/curl|gripper|wrist|pinch|hang|static hold/.test(name)) return fallback === "knee-flexion" ? "knee-flexion" : "elbow-flexion";
  if (/pushdown|triceps|skull|close-grip|jm press|kickback|diamond|tiger bend/.test(name)) return "elbow-extension";
  if (/lunge|split squat|step-up|pistol|shrimp|curtsy/.test(name)) return "lunge";
  if (/leg curl|nordic|glute-ham|razor curl/.test(name)) return "knee-flexion";
  if (/deadlift|romanian|good morning|hip hinge|back extension|hyperextension|hip thrust|glute bridge|pull-through|kettlebell swing/.test(name)) return "hinge";
  if (/squat|leg press|leg extension|wall sit/.test(name)) return "squat";
  if (/calf|plantar|tibialis|pogo/.test(name)) return "calf-raise";
  if (/crunch|plank|dead bug|bird dog|knee raise|leg raise|rollout|twist|v-up|hollow|woodchopper|rotation|dragon flag|toes-to-bar|l-sit|v-sit|human flag|copenhagen/.test(name)) return "core";
  return fallback;
}

function inferModality(name: string, fallback: "compound" | "isolation"): "compound" | "isolation" {
  if (/fly|raise|curl|pushdown|extension|kickback|abduction|clamshell|frog pump|calf|plantar|tibialis|crunch|plank|dead bug|bird dog|heel touch|knee tuck|pallof|hollow|shrug|pull-apart|retraction|wrist|gripper|pinch|hang|static hold/.test(name)) return "isolation";
  return fallback;
}

function inferEquipment(name: string): Equipment[] {
  if (/smith/.test(name)) return ["smith-machine"];
  if (/cable|pulldown|pushdown|woodchopper|pallof/.test(name)) return ["cable"];
  if (/resistance band|banded|band pull/.test(name)) return ["resistance-band"];
  if (/kettlebell|turkish/.test(name)) return ["kettlebell"];
  if (/dumbbell/.test(name)) return ["dumbbell"];
  if (/barbell|ez-bar|spoto|larsen|bench press|pendlay|good morning|zercher|jefferson|rack pull|clean|snatch|landmine/.test(name)) return ["barbell"];
  if (/machine|pec deck|leg press|hack squat|assisted|treadmill|cycling|elliptical|stair climber|rowing|sled|battle rope/.test(name)) return ["machine"];
  if (/plate|medicine ball|sandbag/.test(name)) return ["dumbbell"];
  return ["bodyweight"];
}

function inferDifficulty(name: string): ExperienceLevel {
  if (/wall |knee |assisted|supported|bodyweight|light |drill|regression|treadmill|stationary|elliptical/.test(name)) return "beginner";
  if (/one-arm|single-arm push-up|handstand|dragon|human flag|front lever|muscle-up|heavy |deficit|snatch|clean and jerk|pistol|nordic|depth jump|weighted vest/.test(name)) return "advanced";
  return "intermediate";
}

function slugifyExerciseName(name: string): string {
  return name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const EXERCISE_LIBRARY: ExerciseDefinition[] = EXERCISE_CATALOG_NAMES.map((name, index) => {
  const curated = curatedById.get(LEGACY_ID_BY_CATALOG_NAME[name] ?? "") ?? curatedByName.get(name.toLowerCase());
  return curated ? { ...curated, name } : inferExerciseDefinition(name, index);
});

const exerciseById = new Map([...CURATED_EXERCISE_LIBRARY, ...EXERCISE_LIBRARY].map((exercise) => [exercise.id, exercise]));
