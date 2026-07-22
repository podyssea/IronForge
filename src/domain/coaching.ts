import { Equipment, ExperienceLevel, TrainingStyle } from "./exerciseLibrary";

export type CoachingProfile = {
  goal: TrainingStyle;
  experience: ExperienceLevel;
  sessionMinutes: number;
  availableEquipment: Equipment[];
  preferredExerciseIds: string[];
  excludedExerciseIds: string[];
};

export const DEFAULT_COACHING_PROFILE: CoachingProfile = {
  goal: "hypertrophy",
  experience: "intermediate",
  sessionMinutes: 60,
  availableEquipment: ["barbell", "dumbbell", "cable", "machine", "smith-machine", "bodyweight", "resistance-band", "kettlebell"],
  preferredExerciseIds: [],
  excludedExerciseIds: [],
};
