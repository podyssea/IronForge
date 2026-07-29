import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { displayWeight, EffortMetric, Exercise, isWorkingSet, LoadingType, progression, setValidationError, SetLog, storedWeight, WeightUnit, weightUnitLabel } from "../domain/training";

type ExerciseCardProps = {
  exercise: Exercise;
  number: number;
  editable: boolean;
  onChange: (id: string, set: number, changes: Partial<SetLog>) => void;
  onReplace?: (id: string) => void;
  onLoadingType?: (id: string, loadingType: LoadingType) => void;
  weightUnit: WeightUnit;
  effortMetric: EffortMetric;
  editingProgram?: boolean;
  onPrescription?: (id: string, changes: { name?: string; targetSets?: number; repRange?: [number, number]; loadIncrement?: number; restSeconds?: number }) => void;
  onMove?: (id: string, direction: -1 | 1) => void;
  onRemove?: (id: string) => void;
  onSetCompleted?: (exercise: Exercise) => void;
};

export function ExerciseCard({ exercise, number, editable, onChange, onReplace, onLoadingType, weightUnit, effortMetric, editingProgram, onPrescription, onMove, onRemove, onSetCompleted }: ExerciseCardProps) {
  const isComplete = exercise.sets.every((set) => set.completed);
  const toggleExercise = () => {
    if (!isComplete) {
      const invalid = exercise.sets.find(setValidationError);
      if (invalid) return Alert.alert("Check set values", setValidationError(invalid) ?? "Enter valid values before completing this exercise.");
    }
    exercise.sets.forEach((_, index) => onChange(exercise.id, index, { completed: !isComplete }));
  };
  const updateSetValue = (set: SetLog, index: number, changes: Partial<SetLog>) => {
    const next = { ...set, ...changes };
    onChange(exercise.id, index, { ...changes, ...(set.completed && setValidationError(next) ? { completed: false } : {}) });
  };
  const toggleSet = (set: SetLog, index: number) => {
    const error = setValidationError(set);
    if (!set.completed && error) return Alert.alert("Set not complete", error);
    onChange(exercise.id, index, { completed: !set.completed });
    if (!set.completed) onSetCompleted?.(exercise);
  };

  const warmupCount = Math.max(0, exercise.sets.length - 2);
  return <View style={styles.card}><View style={styles.exerciseHeader}><View style={styles.headerMain}><Text style={styles.exerciseNumber}>EXERCISE {String(number).padStart(2, "0")}</Text><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseMeta}>{warmupCount ? `${warmupCount} warm-up · ` : ""}2 working · {exercise.repRange[0]}–{exercise.repRange[1]} reps</Text></View><View style={styles.previous}><Text style={styles.previousLabel}>WORKING LOAD</Text><Text style={styles.previousValue}>{displayWeight(exercise.lastWeight, weightUnit)} <Text style={styles.unit}>{weightUnitLabel(weightUnit)}</Text> × {exercise.lastReps}</Text></View></View>
    {editingProgram && onPrescription && <View style={styles.editor}><Text style={styles.editorLabel}>EXERCISE NAME</Text><TextInput value={exercise.name} onChangeText={(name) => onPrescription(exercise.id, { name })} style={styles.editorInput} /><View style={styles.editorRow}><NumberEditor label="SETS" value={exercise.targetSets} onChange={(targetSets) => onPrescription(exercise.id, { targetSets })} /><NumberEditor label="MIN REPS" value={exercise.repRange[0]} onChange={(value) => onPrescription(exercise.id, { repRange: [value, Math.max(value, exercise.repRange[1])] })} /><NumberEditor label="MAX REPS" value={exercise.repRange[1]} onChange={(value) => onPrescription(exercise.id, { repRange: [exercise.repRange[0], Math.max(exercise.repRange[0], value)] })} /></View><View style={styles.editorRow}><NumberEditor label={`INCREMENT (${weightUnitLabel(weightUnit).toUpperCase()})`} value={displayWeight(exercise.loadIncrement ?? 2.5, weightUnit)} decimal onChange={(value) => onPrescription(exercise.id, { loadIncrement: storedWeight(value, weightUnit) })} /><NumberEditor label="REST (SEC)" value={exercise.restSeconds ?? 90} onChange={(restSeconds) => onPrescription(exercise.id, { restSeconds })} /></View><View style={styles.editorActions}><Pressable onPress={() => onMove?.(exercise.id, -1)} style={styles.editorButton}><Text style={styles.editorButtonText}>↑ MOVE</Text></Pressable><Pressable onPress={() => onMove?.(exercise.id, 1)} style={styles.editorButton}><Text style={styles.editorButtonText}>↓ MOVE</Text></Pressable><Pressable onPress={() => onRemove?.(exercise.id)} style={styles.removeButton}><Text style={styles.removeButtonText}>REMOVE</Text></Pressable></View></View>}
    {!editingProgram && <><View style={styles.tableHead}><Text style={[styles.head, styles.setCol]}>SET</Text><Text style={[styles.head, styles.inputCol]}>{weightUnitLabel(weightUnit).toUpperCase()}</Text><Text style={[styles.head, styles.inputCol]}>REPS</Text><Text style={[styles.head, styles.doneCol]}>DONE</Text></View>
    {exercise.sets.map((set, index) => { const error = setValidationError(set); const working = isWorkingSet(exercise, index); return <View key={index}><View style={[styles.setRow, set.completed && styles.setRowDone, error && styles.setRowInvalid]}><View style={styles.setCol}><Text style={styles.setNumber}>{index + 1}</Text><Text style={[styles.setRole, working && styles.setRoleWorking]}>{working ? "WORK" : "WARM"}</Text></View><TextInput editable={editable} value={String(displayWeight(set.weight, weightUnit))} onChangeText={(text) => updateSetValue(set, index, { weight: storedWeight(Number(text.replace(",", ".")) || 0, weightUnit) })} keyboardType="decimal-pad" selectTextOnFocus style={[styles.input, styles.inputCol, !editable && styles.inputDisabled]} /><TextInput editable={editable} value={String(set.reps)} onChangeText={(text) => updateSetValue(set, index, { reps: Number(text) || 0 })} keyboardType="number-pad" selectTextOnFocus style={[styles.input, styles.inputCol, !editable && styles.inputDisabled]} /><Pressable disabled={!editable} accessibilityRole="checkbox" accessibilityState={{ checked: set.completed, disabled: !editable }} accessibilityLabel={`${exercise.name}, ${working ? "working" : "warm-up"} set ${index + 1}`} onPress={() => toggleSet(set, index)} style={[styles.setToggle, set.completed && styles.setToggleDone, !editable && styles.setToggleDisabled]}><Text style={[styles.setToggleText, set.completed && styles.setToggleTextDone]}>{set.completed ? "✓" : ""}</Text></Pressable></View>{editable && working && <View style={styles.effortRow}><Text style={styles.effortLabel}>{effortMetric.toUpperCase()}</Text><TextInput value={String(effortMetric === "rir" ? set.rir ?? "" : set.rpe ?? "")} placeholder={effortMetric === "rir" ? "0–5" : "5–10"} placeholderTextColor="#687067" onChangeText={(text) => updateSetValue(set, index, effortMetric === "rir" ? { rir: text === "" ? undefined : Number(text), rpe: undefined } : { rpe: text === "" ? undefined : Number(text), rir: undefined })} keyboardType="decimal-pad" style={styles.effortInput} /></View>}{editable && error && <Text style={styles.setError}>{error}</Text>}</View>; })}</>}
    {editable && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isComplete }} onPress={toggleExercise} style={[styles.exerciseToggle, isComplete && styles.exerciseToggleDone]}><Text style={[styles.exerciseToggleText, isComplete && styles.exerciseToggleTextDone]}>{isComplete ? "✓ EXERCISE COMPLETE" : "MARK EXERCISE COMPLETE"}</Text></Pressable>}
    {!editable && onLoadingType && <View style={styles.loadingType}><Text style={styles.loadingLabel}>MACHINE LOADING</Text><View style={styles.loadingChoices}>{(["pin-loaded", "plate-loaded"] as LoadingType[]).map((item) => <Pressable key={item} onPress={() => onLoadingType(exercise.id, item)} style={[styles.loadingChoice, exercise.loadingType === item && styles.loadingChoiceActive]}><Text style={[styles.loadingChoiceText, exercise.loadingType === item && styles.loadingChoiceTextActive]}>{item === "pin-loaded" ? "PIN LOADED" : "PLATE LOADED"}</Text></Pressable>)}</View></View>}
    {!editable && onReplace && <Pressable onPress={() => onReplace(exercise.id)} style={styles.replace}><Text style={styles.replaceText}>FIND A SUBSTITUTE</Text></Pressable>}
    {exercise.selectionReason && <Text style={styles.reason}>COACH: {exercise.selectionReason}</Text>}
    {!editingProgram && <Text style={styles.tip}>{progression(exercise, weightUnit)}</Text>}
  </View>;
}

function NumberEditor({ label, value, decimal, onChange }: { label: string; value: number; decimal?: boolean; onChange: (value: number) => void }) {
  return <View style={styles.numberEditor}><Text style={styles.editorLabel}>{label}</Text><TextInput value={String(value)} onChangeText={(text) => onChange(Number(text.replace(",", ".")) || 0)} keyboardType={decimal ? "decimal-pad" : "number-pad"} style={styles.editorInput} /></View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#1a1f1a", borderRadius: 10, padding: 15, marginTop: 14 },
  exerciseHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }, headerMain: { flex: 1, paddingRight: 8 },
  exerciseNumber: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  exerciseName: { color: "#f3f5f1", fontSize: 17, fontWeight: "800", marginTop: 3 },
  exerciseMeta: { color: "#8b9489", fontSize: 11, marginTop: 3 },
  previous: { alignItems: "flex-end" }, previousLabel: { color: "#717971", fontSize: 8, fontWeight: "800", letterSpacing: .8 },
  previousValue: { color: "#ebeee8", fontSize: 12, fontWeight: "700", marginTop: 4 }, unit: { color: "#929a91" },
  tableHead: { flexDirection: "row", paddingBottom: 7 }, head: { color: "#777f76", fontSize: 9, fontWeight: "800", letterSpacing: .7 },
  setCol: { width: "14%" }, inputCol: { width: "33%" }, doneCol: { width: "20%", textAlign: "center" },
  setRow: { flexDirection: "row", alignItems: "center", minHeight: 45, borderTopWidth: 1, borderTopColor: "#2b312b" },
  setRowDone: { backgroundColor: "#202a1d" }, setRowInvalid: { borderTopColor: "#7d443a" },
  setNumber: { color: "#aeb5ad", fontSize: 13, fontWeight: "700", paddingLeft: 6 }, setRole: { color: "#717971", fontSize: 6, fontWeight: "900", letterSpacing: .4, paddingLeft: 6 }, setRoleWorking: { color: "#d8ff38" },
  input: { color: "#f5f7f2", fontSize: 16, fontWeight: "800", height: 34, textAlign: "left" }, inputDisabled: { color: "#7d857c" },
  setToggle: { width: 25, height: 25, borderRadius: 5, borderColor: "#667063", borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginHorizontal: 13 },
  setToggleDone: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, setToggleDisabled: { opacity: .35 },
  setToggleText: { color: "#899188", fontSize: 14, fontWeight: "900" }, setToggleTextDone: { color: "#15200e" },
  setError: { color: "#e28b7d", fontSize: 9, fontWeight: "700", marginTop: -2, marginBottom: 7, marginLeft: "14%" },
  exerciseToggle: { height: 38, marginTop: 12, borderWidth: 1, borderColor: "#667063", borderRadius: 6, justifyContent: "center", alignItems: "center" },
  exerciseToggleDone: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, exerciseToggleText: { color: "#cbd1c9", fontSize: 10, fontWeight: "900", letterSpacing: .8 },
  exerciseToggleTextDone: { color: "#15200e" }, tip: { color: "#858d83", fontSize: 10, marginTop: 11, lineHeight: 14 },
  replace: { height: 34, borderRadius: 6, borderWidth: 1, borderColor: "#566052", justifyContent: "center", alignItems: "center", marginTop: 11 }, replaceText: { color: "#c2c9bf", fontSize: 9, fontWeight: "900", letterSpacing: .7 },
  reason: { color: "#b9c99b", fontSize: 10, lineHeight: 15, marginTop: 11 },
  loadingType: { marginTop: 12 }, loadingLabel: { color: "#777f76", fontSize: 8, fontWeight: "900", letterSpacing: .8, marginBottom: 7 },
  loadingChoices: { flexDirection: "row", gap: 7 }, loadingChoice: { flex: 1, borderWidth: 1, borderColor: "#566052", borderRadius: 6, paddingVertical: 8, alignItems: "center" }, loadingChoiceActive: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, loadingChoiceText: { color: "#aeb5ad", fontSize: 8, fontWeight: "900", letterSpacing: .5 }, loadingChoiceTextActive: { color: "#15200e" },
  effortRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingVertical: 5, borderTopWidth: 1, borderTopColor: "#2b312b" }, effortLabel: { color: "#d8ff38", fontSize: 8, fontWeight: "900" }, effortInput: { width: 62, height: 30, borderWidth: 1, borderColor: "#4b5548", borderRadius: 5, color: "#f5f7f2", textAlign: "center", fontSize: 12, fontWeight: "800" },
  editor: { borderTopWidth: 1, borderTopColor: "#303730", paddingTop: 12, gap: 8 }, editorLabel: { color: "#858e83", fontSize: 7, fontWeight: "900", letterSpacing: .6 }, editorInput: { height: 36, borderWidth: 1, borderColor: "#485146", borderRadius: 6, color: "#f3f5f1", paddingHorizontal: 9, fontSize: 11, fontWeight: "700" }, editorRow: { flexDirection: "row", gap: 7 }, numberEditor: { flex: 1, gap: 4 }, editorActions: { flexDirection: "row", gap: 7, marginTop: 4 }, editorButton: { flex: 1, height: 34, borderWidth: 1, borderColor: "#566052", borderRadius: 6, justifyContent: "center", alignItems: "center" }, editorButtonText: { color: "#c2c9bf", fontSize: 8, fontWeight: "900" }, removeButton: { flex: 1, height: 34, borderWidth: 1, borderColor: "#814d45", borderRadius: 6, justifyContent: "center", alignItems: "center" }, removeButtonText: { color: "#e09588", fontSize: 8, fontWeight: "900" },
});
