import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { InlineExercisePicker } from "../components/InlineExercisePicker";
import type { ExerciseDefinition } from "../domain/exerciseLibrary";
import { RoutineExerciseList, type RoutineScroll } from "../components/RoutineExerciseList";
import { type RoutineEdit, type Workout } from "../domain/training";

type WorkoutSetupScreenProps = {
  workouts: Workout[];
  selectedWorkoutIndex: number;
  workout: Workout;
  canStart: boolean;
  deloadEnabled: boolean;
  preferredExerciseIds: string[];
  onSelect: (index: number) => void;
  onBegin: () => void;
  onEditRoutine: (edit: RoutineEdit) => void;
  onDeloadToggle: () => void;
  scroll: RoutineScroll;
};

type Picker = { type: "add" } | { type: "replace"; exerciseId: string };

export function WorkoutSetupScreen({
  workouts, selectedWorkoutIndex, workout, canStart, deloadEnabled, preferredExerciseIds,
  onSelect, onBegin, onEditRoutine, onDeloadToggle, scroll,
}: WorkoutSetupScreenProps) {
  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const replacingId = picker?.type === "replace" ? picker.exerciseId : "";
  const startDisabled = !canStart || !workout.exercises.length;

  function closePicker() {
    setPicker(null);
  }

  function selectExercise(exercise: ExerciseDefinition) {
    if (picker) onEditRoutine({ ...picker, exercise });
    closePicker();
  }

  const exercisePicker = picker && <InlineExercisePicker
    key={replacingId || "add"}
    mode={picker.type}
    exerciseId={replacingId}
    excludedIds={workout.exercises.filter(({ id }) => id !== replacingId).map(({ id }) => id)}
    preferredIds={preferredExerciseIds}
    onSelect={selectExercise}
    onCancel={closePicker}
  />;

  return <View style={styles.setup}>
    <Text accessibilityRole="header" style={styles.title}>{workout.title.split(" · ").pop()}</Text>
    {workouts.length > 1 && <View accessibilityRole="tablist" style={styles.days}>
      {workouts.map((day, index) => {
        const selected = index === selectedWorkoutIndex;
        return <Pressable
          key={day.id}
          accessibilityRole="tab"
          accessibilityLabel={`Day ${index + 1}, ${day.title.split(" · ").pop()}`}
          accessibilityState={{ selected }}
          onPress={() => { closePicker(); setOpenExerciseId(null); onSelect(index); }}
          style={({ pressed }) => [styles.day, selected && styles.selectedDay, pressed && styles.pressed]}
        ><Text style={[styles.dayText, selected && styles.selectedDayText]}>Day {index + 1}</Text></Pressable>;
      })}
    </View>}
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: startDisabled }}
      disabled={startDisabled}
      onPress={onBegin}
      style={({ pressed }) => [styles.start, startDisabled && styles.disabled, pressed && styles.pressed]}
    ><Text style={styles.startText}>{deloadEnabled ? "Start deload workout" : "Start workout"}</Text></Pressable>
    <View style={styles.listHeading}>
      <Text accessibilityRole="header" style={styles.listTitle}>Exercises</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add exercise"
        accessibilityState={{ expanded: picker?.type === "add" }}
        onPress={() => { setOpenExerciseId(null); setPicker(picker?.type === "add" ? null : { type: "add" }); }}
        style={({ pressed }) => [styles.add, pressed && styles.pressed]}
      ><Text aria-hidden style={styles.addText}>+</Text></Pressable>
    </View>
    {picker?.type === "add" && exercisePicker}
    {!workout.exercises.length && <Text style={styles.empty}>Add an exercise to start this workout.</Text>}
    <RoutineExerciseList
      exercises={workout.exercises}
      openExerciseId={openExerciseId}
      onReveal={setOpenExerciseId}
      onReplace={(exerciseId) => {
        setOpenExerciseId(null);
        setPicker({ type: "replace", exerciseId });
      }}
      onDelete={(exerciseId) => {
        setOpenExerciseId(null);
        if (replacingId === exerciseId) closePicker();
        onEditRoutine({ type: "remove", exerciseId });
      }}
      onEdit={onEditRoutine}
      scroll={scroll}
      picker={replacingId ? { exerciseId: replacingId, content: exercisePicker } : undefined}
    />
    {canStart && <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Deload workout at 75 percent"
      accessibilityState={{ checked: deloadEnabled }}
      onPress={onDeloadToggle}
      style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
    ><Text style={styles.secondaryText}>Deload at 75% · {deloadEnabled ? "On" : "Off"}</Text></Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  setup: { marginTop: 24 },
  title: { color: "#f8faf5", fontSize: 34, fontWeight: "800" },
  days: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  day: { flexGrow: 1, minWidth: 44, minHeight: 44, paddingHorizontal: 6, paddingVertical: 6, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#1a1f1a" },
  dayText: { color: "#aab3a7", fontSize: 12, fontWeight: "800" },
  selectedDay: { backgroundColor: "#d8ff38" },
  selectedDayText: { color: "#15190f" },
  start: { minHeight: 56, marginTop: 16, borderRadius: 9, padding: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#d8ff38" },
  startText: { color: "#15190f", fontSize: 16, fontWeight: "900", textAlign: "center" },
  listHeading: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  listTitle: { color: "#f8faf5", fontSize: 18, fontWeight: "800" },
  empty: { color: "#aab3a7", paddingVertical: 12 },
  edit: { minHeight: 44, paddingHorizontal: 8, paddingVertical: 5, justifyContent: "center" },
  add: { minHeight: 44, minWidth: 44, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  addText: { color: "#d8ff38", fontSize: 28, fontWeight: "800" },
  secondaryText: { color: "#cbd1c8", fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.72 },
});
