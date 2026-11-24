import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { displayExerciseWeight, exerciseWeightLabel, Exercise, isWorkingSet, setValidationError, SetLog, storedExerciseWeight, WeightUnit } from "../domain/training";

type BackfillExerciseCardProps = {
  exercise: Exercise;
  expanded: boolean;
  weightUnit: WeightUnit;
  onToggle: () => void;
  onSetChange: (setIndex: number, patch: Partial<SetLog>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
};

export function BackfillExerciseCard({ exercise, expanded, weightUnit, onToggle, onSetChange, onAddSet, onRemoveSet }: BackfillExerciseCardProps) {
  const completed = exercise.sets.filter((set) => set.completed).length;
  const representative = exercise.sets.findLast((set) => set.completed) ?? exercise.sets.at(-1);
  return <View style={[styles.card, completed < exercise.sets.length && styles.cardNeedsReview]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${exercise.name}, ${completed} of ${exercise.sets.length} sets complete`} onPress={onToggle} style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
      <View style={styles.headerCopy}><Text style={styles.name}>{exercise.name}</Text><Text style={styles.summary}>{representative ? `${displayExerciseWeight(representative.weight, exercise, weightUnit)} ${exerciseWeightLabel(exercise, weightUnit)} × ${representative.reps} · ${exercise.sets.length} sets` : "No sets"}</Text></View>
      <View style={styles.status}><Text style={styles.count}>{completed}/{exercise.sets.length}</Text><Text style={styles.state}>{completed === exercise.sets.length ? "✓ COMPLETE" : "NEEDS REVIEW"}</Text><Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text></View>
    </Pressable>
    {expanded && <View style={styles.body}>
      {exercise.sets.map((set, index) => <SetEditor key={index} exercise={exercise} set={set} setIndex={index} weightUnit={weightUnit} canRemove={exercise.sets.length > 1} onChange={(patch) => onSetChange(index, patch)} onRemove={() => onRemoveSet(index)} />)}
      <Pressable accessibilityRole="button" onPress={onAddSet} style={({ pressed }) => [styles.addSet, pressed && styles.pressed]}><Text style={styles.addSetText}>＋ ADD SET</Text></Pressable>
    </View>}
  </View>;
}

function SetEditor({ exercise, set, setIndex, weightUnit, canRemove, onChange, onRemove }: { exercise: Exercise; set: SetLog; setIndex: number; weightUnit: WeightUnit; canRemove: boolean; onChange: (patch: Partial<SetLog>) => void; onRemove: () => void }) {
  const [weightText, setWeightText] = useState(String(displayExerciseWeight(set.weight, exercise, weightUnit)));
  const [repsText, setRepsText] = useState(String(set.reps));
  const editingWeight = useRef(false);
  const editingReps = useRef(false);
  const error = setValidationError(set, exercise, setIndex);
  useEffect(() => {
    if (!editingWeight.current) setWeightText(String(displayExerciseWeight(set.weight, exercise, weightUnit)));
  }, [exercise, set.weight, weightUnit]);
  useEffect(() => {
    if (!editingReps.current) setRepsText(String(set.reps));
  }, [set.reps]);
  const changeWeight = (text: string) => {
    setWeightText(text);
    const value = text.trim() ? Number(text.replace(",", ".")) : Number.NaN;
    onChange({ weight: Number.isFinite(value) ? storedExerciseWeight(value, exercise, weightUnit) : Number.NaN });
  };
  const changeReps = (text: string) => {
    setRepsText(text);
    const value = text.trim() ? Number(text) : Number.NaN;
    onChange({ reps: Number.isInteger(value) ? value : Number.NaN });
  };
  return <View style={[styles.setBlock, error && styles.setBlockError]}>
    <View style={styles.setTop}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: set.completed }} accessibilityLabel={`Set ${setIndex + 1}, ${isWorkingSet(exercise, setIndex) ? "working" : "warm-up"} set`} onPress={() => onChange({ completed: !set.completed })} style={[styles.check, set.completed && styles.checkDone]}><Text style={[styles.checkText, set.completed && styles.checkTextDone]}>{set.completed ? "✓" : "○"}</Text></Pressable>
      <View style={styles.setIdentity}><Text style={styles.setTitle}>SET {setIndex + 1}</Text><Text style={styles.setRole}>{isWorkingSet(exercise, setIndex) ? "WORK" : "WARM"} · {set.completed ? "INCLUDED" : "SKIPPED"}</Text></View>
      {canRemove && <Pressable accessibilityRole="button" accessibilityLabel={`Remove set ${setIndex + 1}`} onPress={onRemove} style={styles.remove}><Text style={styles.removeText}>REMOVE</Text></Pressable>}
    </View>
    <View style={styles.inputs}>
      <View style={styles.inputGroup}><Text style={styles.inputLabel}>WEIGHT · {exerciseWeightLabel(exercise, weightUnit).toUpperCase()}</Text><TextInput accessibilityLabel={`${exercise.name}, set ${setIndex + 1}, weight in ${exerciseWeightLabel(exercise, weightUnit)}`} value={weightText} onChangeText={changeWeight} onFocus={() => { editingWeight.current = true; }} onBlur={() => { editingWeight.current = false; }} keyboardType="decimal-pad" selectTextOnFocus style={styles.input} /></View>
      <Text style={styles.multiply}>×</Text>
      <View style={styles.inputGroup}><Text style={styles.inputLabel}>REPS</Text><TextInput accessibilityLabel={`${exercise.name}, set ${setIndex + 1}, repetitions`} value={repsText} onChangeText={changeReps} onFocus={() => { editingReps.current = true; }} onBlur={() => { editingReps.current = false; }} keyboardType="number-pad" selectTextOnFocus style={styles.input} /></View>
    </View>
    {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#1a1f1a", borderRadius: 9, borderWidth: 1, borderColor: "#40503a", marginTop: 10, overflow: "hidden" }, cardNeedsReview: { borderColor: "#7b6340" },
  header: { minHeight: 68, padding: 13, flexDirection: "row", alignItems: "center" }, pressed: { opacity: .72 }, headerCopy: { flex: 1, paddingRight: 10 }, name: { color: "#f3f5f1", fontSize: 15, fontWeight: "800" }, summary: { color: "#939c91", fontSize: 10, marginTop: 5 }, status: { alignItems: "flex-end", minWidth: 78 }, count: { color: "#d8ff38", fontSize: 14, fontWeight: "900" }, state: { color: "#aab3a7", fontSize: 7, fontWeight: "900", marginTop: 3 }, chevron: { color: "#d8ff38", fontSize: 8, marginTop: 5 },
  body: { borderTopWidth: 1, borderTopColor: "#303730", padding: 10 }, setBlock: { borderRadius: 7, backgroundColor: "#20251f", borderWidth: 1, borderColor: "#343c33", padding: 9, marginBottom: 8 }, setBlockError: { borderColor: "#8b4e44" }, setTop: { minHeight: 44, flexDirection: "row", alignItems: "center" }, check: { width: 44, height: 44, borderRadius: 7, borderWidth: 1, borderColor: "#697267", alignItems: "center", justifyContent: "center" }, checkDone: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, checkText: { color: "#cbd1c9", fontSize: 20, fontWeight: "900" }, checkTextDone: { color: "#15200e" }, setIdentity: { flex: 1, paddingLeft: 9 }, setTitle: { color: "#eef1eb", fontSize: 11, fontWeight: "900" }, setRole: { color: "#899188", fontSize: 7, fontWeight: "800", marginTop: 3 }, remove: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }, removeText: { color: "#d99488", fontSize: 8, fontWeight: "900" },
  inputs: { flexDirection: "row", alignItems: "flex-end", gap: 7, marginTop: 8 }, inputGroup: { flex: 1 }, inputLabel: { color: "#899188", fontSize: 7, fontWeight: "900", letterSpacing: .6, marginBottom: 5 }, input: { minHeight: 44, borderRadius: 7, borderWidth: 1, borderColor: "#566052", color: "#f5f7f2", fontSize: 16, fontWeight: "800", paddingHorizontal: 11, backgroundColor: "#171b17" }, multiply: { color: "#7c847a", fontSize: 18, paddingBottom: 11 }, error: { color: "#e28b7d", fontSize: 10, fontWeight: "700", lineHeight: 15, marginTop: 7 },
  addSet: { minHeight: 44, borderRadius: 7, borderWidth: 1, borderColor: "#697267", alignItems: "center", justifyContent: "center" }, addSetText: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .7 },
});
