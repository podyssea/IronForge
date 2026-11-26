import { Pressable, StyleSheet, Text, View } from "react-native";
import { getExerciseDefinition } from "../domain/exerciseLibrary";
import { Exercise } from "../domain/training";
import { CONVENTIONAL_DEADLIFT_ID } from "../domain/deadlift";
import { DeadliftPrescriptionControls } from "./DeadliftPrescriptionControls";

type ExerciseEditorRowProps = {
  exercise: Exercise;
  position: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
  onReplace: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onPrescriptionChange: (changes: { targetSets?: number; repRange?: [number, number] }) => void;
};

export function ExerciseEditorRow({ exercise, position, canMoveUp, canMoveDown, canRemove, onReplace, onMove, onRemove, onPrescriptionChange }: ExerciseEditorRowProps) {
  const definition = getExerciseDefinition(exercise.id);
  const metadata = definition
    ? `${definition.primaryMuscles.map(readable).join(", ")} · ${definition.equipment.map(readable).join(", ")}`
    : "Exercise details unavailable";

  return <View style={styles.card} accessibilityLabel={`Exercise ${position}, ${exercise.name}`}>
    <View style={styles.heading}>
      <Text style={styles.position}>{String(position).padStart(2, "0")}</Text>
      <View style={styles.copy}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.metadata}>{metadata}</Text>
        {exercise.id !== CONVENTIONAL_DEADLIFT_ID && <Text style={styles.prescription}>{exercise.targetSets} sets · {exercise.repRange[0]}–{exercise.repRange[1]} reps{exercise.restSeconds ? ` · ${exercise.restSeconds} sec rest` : ""}</Text>}
      </View>
    </View>
    {exercise.id === CONVENTIONAL_DEADLIFT_ID && <DeadliftPrescriptionControls exercise={exercise} onChange={onPrescriptionChange} />}
    <Pressable accessibilityRole="button" accessibilityLabel={`Replace ${exercise.name}`} onPress={onReplace} style={({ pressed }) => [styles.replace, pressed && styles.pressed]}><Text style={styles.replaceText}>REPLACE EXERCISE</Text></Pressable>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Move ${exercise.name} up`} accessibilityState={{ disabled: !canMoveUp }} disabled={!canMoveUp} onPress={() => onMove(-1)} style={({ pressed }) => [styles.action, !canMoveUp && styles.disabled, pressed && styles.pressed]}><Text style={styles.actionText}>↑ MOVE UP</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Move ${exercise.name} down`} accessibilityState={{ disabled: !canMoveDown }} disabled={!canMoveDown} onPress={() => onMove(1)} style={({ pressed }) => [styles.action, !canMoveDown && styles.disabled, pressed && styles.pressed]}><Text style={styles.actionText}>↓ MOVE DOWN</Text></Pressable>
    </View>
    {canRemove && <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${exercise.name}`} accessibilityHint="Requires confirmation" onPress={onRemove} style={({ pressed }) => [styles.remove, pressed && styles.pressed]}><Text style={styles.removeText}>REMOVE</Text></Pressable>}
  </View>;
}

function readable(value: string): string {
  return value.replaceAll("-", " ");
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#1a1f1a", borderColor: "#343c33", borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 12 },
  heading: { flexDirection: "row", alignItems: "flex-start" }, position: { color: "#d8ff38", fontSize: 11, fontWeight: "900", letterSpacing: 1, width: 30, paddingTop: 3 }, copy: { flex: 1 },
  name: { color: "#f3f5f1", fontSize: 17, fontWeight: "800" }, metadata: { color: "#a2aba0", fontSize: 11, lineHeight: 16, marginTop: 3, textTransform: "capitalize" }, prescription: { color: "#c6ccc3", fontSize: 12, fontWeight: "700", marginTop: 7 },
  replace: { minHeight: 44, borderColor: "#d8ff38", borderWidth: 1, borderRadius: 7, alignItems: "center", justifyContent: "center", marginTop: 13 }, replaceText: { color: "#d8ff38", fontSize: 10, fontWeight: "900", letterSpacing: .7 },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 }, action: { flex: 1, minHeight: 44, borderColor: "#667063", borderWidth: 1, borderRadius: 7, alignItems: "center", justifyContent: "center" }, actionText: { color: "#cbd1c9", fontSize: 9, fontWeight: "900", letterSpacing: .5 },
  remove: { alignSelf: "flex-start", minHeight: 44, minWidth: 88, justifyContent: "center", marginTop: 4 }, removeText: { color: "#df9a8e", fontSize: 9, fontWeight: "900", letterSpacing: .6 }, disabled: { opacity: .3 }, pressed: { backgroundColor: "#293126" },
});
