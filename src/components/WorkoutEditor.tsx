import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Equipment, ExerciseDefinition } from "../domain/exerciseLibrary";
import { addExerciseToWorkoutDraft, Exercise, moveWorkoutExercise, removeExerciseFromWorkoutDraft, replaceExerciseInWorkoutDraft, SessionRecord, Workout } from "../domain/training";
import { ExerciseEditorRow } from "./ExerciseEditorRow";
import { InlineExercisePicker } from "./InlineExercisePicker";

export type WorkoutEditorScope = "session" | "split-draft";

type WorkoutEditorProps = {
  scope: WorkoutEditorScope;
  workout: Workout;
  knownExercises?: Exercise[];
  records?: SessionRecord[];
  preferredExerciseIds?: string[];
  excludedExerciseIds?: string[];
  availableEquipment?: Equipment[];
  onSave: (workout: Workout) => void;
  onCancel: () => void;
};

type PickerState = { mode: "add" } | { mode: "replace"; exerciseId: string };

export function WorkoutEditor({ scope, workout, knownExercises = [], records = [], preferredExerciseIds = [], excludedExerciseIds = [], availableEquipment, onSave, onCancel }: WorkoutEditorProps) {
  const [draft, setDraft] = useState<Workout>(() => workout);
  const [picker, setPicker] = useState<PickerState>();
  const scopeTitle = scope === "session" ? "TODAY'S WORKOUT" : "NEW SPLIT DRAFT";
  const scopeDescription = scope === "session" ? "Changes apply only to this session." : "Your current split stays active until you confirm the full draft.";

  const selectExercise = (definition: ExerciseDefinition) => {
    setDraft((current) => picker?.mode === "replace"
      ? replaceExerciseInWorkoutDraft(current, picker.exerciseId, definition, { knownExercises, records })
      : addExerciseToWorkoutDraft(current, definition, { knownExercises, records }));
    setPicker(undefined);
  };
  const requestRemoval = (exercise: Exercise) => Alert.alert(
    "Remove exercise?",
    `${exercise.name} will be removed from this ${scope === "session" ? "session" : "draft workout"}.`,
    [{ text: "Keep exercise", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => setDraft((current) => removeExerciseFromWorkoutDraft(current, exercise.id)) }],
  );

  return <View style={styles.container}>
    <View style={styles.scopeBanner}>
      <Text accessibilityRole="header" style={styles.scopeTitle}>{scopeTitle}</Text>
      <Text style={styles.scopeDescription}>{scopeDescription}</Text>
    </View>
    <Text accessibilityRole="header" style={styles.workoutTitle}>{draft.title}</Text>
    <Text style={styles.focus}>{draft.focus}</Text>

    {picker && <View style={styles.pickerPanel}>
      <InlineExercisePicker
        mode={picker.mode}
        exerciseId={picker.mode === "replace" ? picker.exerciseId : ""}
        excludedIds={draft.exercises.map((exercise) => exercise.id)}
        preferredIds={preferredExerciseIds}
        profileExcludedIds={excludedExerciseIds}
        availableEquipment={availableEquipment}
        onSelect={selectExercise}
        onCancel={() => setPicker(undefined)}
      />
    </View>}

    {!picker && <>
      {draft.exercises.map((exercise, index) => {
        const partnerIndex = exercise.supersetId ? draft.exercises.findIndex((candidate) => candidate.id !== exercise.id && candidate.supersetId === exercise.supersetId) : -1;
        const blockStart = partnerIndex >= 0 ? Math.min(index, partnerIndex) : index;
        const blockEnd = partnerIndex >= 0 ? Math.max(index, partnerIndex) : index;
        return <ExerciseEditorRow
          key={exercise.id}
          exercise={exercise}
          position={index + 1}
          canMoveUp={blockStart > 0}
          canMoveDown={blockEnd < draft.exercises.length - 1}
          canRemove={draft.exercises.length > 1}
          onReplace={() => setPicker({ mode: "replace", exerciseId: exercise.id })}
          onMove={(direction) => setDraft((current) => moveWorkoutExercise(current, exercise.id, direction))}
          onRemove={() => requestRemoval(exercise)}
        />;
      })}
      <Pressable accessibilityRole="button" accessibilityLabel="Add exercise" onPress={() => setPicker({ mode: "add" })} style={({ pressed }) => [styles.add, pressed && styles.pressed]}><Text style={styles.addText}>＋ ADD EXERCISE</Text></Pressable>
    </>}

    <View style={styles.footer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel workout editing" accessibilityHint="Discards all unsaved changes" onPress={onCancel} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}><Text style={styles.cancelText}>CANCEL</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Save changes to ${scope === "session" ? "today's workout" : "this draft workout"}`} onPress={() => onSave(draft)} style={({ pressed }) => [styles.save, pressed && styles.savePressed]}><Text style={styles.saveText}>SAVE CHANGES</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { paddingBottom: 20 }, scopeBanner: { backgroundColor: "#26311e", borderLeftColor: "#d8ff38", borderLeftWidth: 4, borderRadius: 8, padding: 12 }, scopeTitle: { color: "#d8ff38", fontSize: 11, fontWeight: "900", letterSpacing: 1 }, scopeDescription: { color: "#c9d0c5", fontSize: 12, lineHeight: 18, marginTop: 4 },
  workoutTitle: { color: "#f3f5f1", fontSize: 24, fontWeight: "900", marginTop: 18 }, focus: { color: "#a2aba0", fontSize: 13, marginTop: 4 }, pickerPanel: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#566052" },
  add: { minHeight: 52, borderColor: "#d8ff38", borderWidth: 1, borderStyle: "dashed", borderRadius: 9, justifyContent: "center", alignItems: "center", marginTop: 14 }, addText: { color: "#d8ff38", fontSize: 11, fontWeight: "900", letterSpacing: .8 },
  footer: { flexDirection: "row", gap: 10, marginTop: 22 }, cancel: { flex: 1, minHeight: 50, borderColor: "#667063", borderWidth: 1, borderRadius: 8, justifyContent: "center", alignItems: "center" }, cancelText: { color: "#cbd1c9", fontSize: 11, fontWeight: "900", letterSpacing: .7 }, save: { flex: 1.5, minHeight: 50, backgroundColor: "#d8ff38", borderRadius: 8, justifyContent: "center", alignItems: "center" }, saveText: { color: "#15200e", fontSize: 11, fontWeight: "900", letterSpacing: .7 }, pressed: { backgroundColor: "#293126" }, savePressed: { backgroundColor: "#b9db31" },
});
