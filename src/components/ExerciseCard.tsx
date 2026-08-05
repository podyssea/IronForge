import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { displayExerciseWeight, exerciseWeightLabel, Exercise, isWorkingSet, loadIncrement, LoadingType, progression, setValidationError, SetLog, WeightUnit } from "../domain/training";
import { NumberOption, NumberPicker } from "./NumberPicker";

type ExerciseCardProps = {
  exercise: Exercise;
  number: number;
  editable: boolean;
  onChange: (id: string, set: number, changes: Partial<SetLog>) => void;
  onReplace?: (id: string) => void;
  onLoadingType?: (id: string, loadingType: LoadingType) => void;
  weightUnit: WeightUnit;
  onAddSet?: (id: string) => void;
  onRemoveSet?: (id: string) => void;
  onSetCompleted?: (exercise: Exercise) => void;
};

export function ExerciseCard({ exercise, number, editable, onChange, onReplace, onLoadingType, weightUnit, onAddSet, onRemoveSet, onSetCompleted }: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(number === 1);
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
  const weightOptions = useMemo(() => buildWeightOptions(exercise, weightUnit), [exercise.lastWeight, exercise.loadIncrement, exercise.loadingType, weightUnit]);
  return <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((current) => !current)} style={[styles.exerciseHeader, !expanded && styles.exerciseHeaderCollapsed]}><View style={styles.headerMain}><Text style={styles.exerciseNumber}>EXERCISE {String(number).padStart(2, "0")}</Text><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseMeta}>{warmupCount ? `${warmupCount} warm-up · ` : ""}2 working · {exercise.repRange[0]}–{exercise.repRange[1]} reps</Text></View><View style={styles.previous}><Text style={styles.previousLabel}>{exercise.loadingType === "plate-loaded" ? "WORKING LOAD / SIDE" : "WORKING LOAD"}</Text><Text style={styles.previousValue}>{displayExerciseWeight(exercise.lastWeight, exercise, weightUnit)} <Text style={styles.unit}>{exerciseWeightLabel(exercise, weightUnit)}</Text> × {exercise.lastReps}</Text><Text style={styles.expand}>{expanded ? "COLLAPSE ︿" : "EXPAND ﹀"}</Text></View></Pressable>
    {expanded && <><View style={styles.tableHead}><Text style={[styles.head, styles.setCol]}>SET</Text><Text style={[styles.head, styles.inputCol]}>{exerciseWeightLabel(exercise, weightUnit).toUpperCase()}</Text><Text style={[styles.head, styles.inputCol]}>REPS</Text><Text style={[styles.head, styles.doneCol]}>DONE</Text></View>
    {exercise.sets.map((set, index) => { const error = setValidationError(set); const working = isWorkingSet(exercise, index); return <View key={index}><View style={[styles.setRow, set.completed && styles.setRowDone, error && styles.setRowInvalid]}><View style={styles.setCol}><Text style={styles.setNumber}>{index + 1}</Text><Text style={[styles.setRole, working && styles.setRoleWorking]}>{working ? "WORK" : "WARM"}</Text></View><View style={styles.inputCol}><NumberPicker label={`${exercise.name} weight (${exerciseWeightLabel(exercise, weightUnit)})`} value={set.weight} options={weightOptions} disabled={!editable} onChange={(weight) => updateSetValue(set, index, { weight })} /></View><View style={styles.inputCol}><NumberPicker label={`${exercise.name} set ${index + 1} reps`} value={set.reps} options={REP_OPTIONS} disabled={!editable} onChange={(reps) => updateSetValue(set, index, { reps })} /></View><Pressable disabled={!editable} accessibilityRole="checkbox" accessibilityState={{ checked: set.completed, disabled: !editable }} accessibilityLabel={`${exercise.name}, ${working ? "working" : "warm-up"} set ${index + 1}`} onPress={() => toggleSet(set, index)} style={[styles.setToggle, set.completed && styles.setToggleDone, !editable && styles.setToggleDisabled]}><Text style={[styles.setToggleText, set.completed && styles.setToggleTextDone]}>{set.completed ? "✓" : ""}</Text></Pressable></View>{editable && error && <Text style={styles.setError}>{error}</Text>}</View>; })}
    {editable && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isComplete }} onPress={toggleExercise} style={[styles.exerciseToggle, isComplete && styles.exerciseToggleDone]}><Text style={[styles.exerciseToggleText, isComplete && styles.exerciseToggleTextDone]}>{isComplete ? "✓ EXERCISE COMPLETE" : "MARK EXERCISE COMPLETE"}</Text></Pressable>}
    {!editable && onLoadingType && <View style={styles.loadingType}><Text style={styles.loadingLabel}>MACHINE LOADING</Text><View style={styles.loadingChoices}>{(["pin-loaded", "plate-loaded"] as LoadingType[]).map((item) => <Pressable key={item} onPress={() => onLoadingType(exercise.id, item)} style={[styles.loadingChoice, exercise.loadingType === item && styles.loadingChoiceActive]}><Text style={[styles.loadingChoiceText, exercise.loadingType === item && styles.loadingChoiceTextActive]}>{item === "pin-loaded" ? "PIN LOADED" : "PLATE LOADED · PER SIDE"}</Text></Pressable>)}</View></View>}
    {!editable && (onAddSet || onRemoveSet) && <View style={styles.setActions}>{onRemoveSet && exercise.targetSets > 2 && <Pressable onPress={() => onRemoveSet(exercise.id)} style={styles.removeSet}><Text style={styles.removeSetText}>－ REMOVE SET</Text></Pressable>}{onAddSet && exercise.targetSets < 8 && <Pressable onPress={() => onAddSet(exercise.id)} style={styles.addSet}><Text style={styles.addSetText}>＋ ADD SET</Text></Pressable>}</View>}
    {!editable && onReplace && <Pressable onPress={() => onReplace(exercise.id)} style={styles.replace}><Text style={styles.replaceText}>FIND A SUBSTITUTE</Text></Pressable>}
    {exercise.selectionReason && <Text style={styles.reason}>COACH: {exercise.selectionReason}</Text>}
    <Text style={styles.tip}>{progression(exercise, weightUnit)}</Text></>}
  </View>;
}

const REP_OPTIONS: NumberOption[] = Array.from({ length: 50 }, (_, index) => ({ value: index + 1, label: String(index + 1) }));

function buildWeightOptions(exercise: Exercise, unit: WeightUnit): NumberOption[] {
  const step = loadIncrement(exercise);
  const maximum = Math.max(exercise.loadingType === "plate-loaded" ? 600 : 300, exercise.lastWeight + step * 20);
  const values = Array.from({ length: Math.ceil(maximum / step) + 1 }, (_, index) => Math.round(index * step * 100) / 100);
  exercise.sets.forEach((set) => { if (!values.includes(set.weight)) values.push(set.weight); });
  return values.sort((a, b) => a - b).map((value) => ({ value, label: String(displayExerciseWeight(value, exercise, unit)) }));
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#1a1f1a", borderRadius: 10, padding: 15, marginTop: 14 },
  exerciseHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }, exerciseHeaderCollapsed: { marginBottom: 0 }, headerMain: { flex: 1, paddingRight: 8 },
  exerciseNumber: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  exerciseName: { color: "#f3f5f1", fontSize: 17, fontWeight: "800", marginTop: 3 },
  exerciseMeta: { color: "#8b9489", fontSize: 11, marginTop: 3 },
  previous: { alignItems: "flex-end" }, previousLabel: { color: "#717971", fontSize: 8, fontWeight: "800", letterSpacing: .8 },
  previousValue: { color: "#ebeee8", fontSize: 12, fontWeight: "700", marginTop: 4 }, unit: { color: "#929a91" }, expand: { color: "#d8ff38", fontSize: 7, fontWeight: "900", marginTop: 9 },
  tableHead: { flexDirection: "row", paddingBottom: 7 }, head: { color: "#777f76", fontSize: 9, fontWeight: "800", letterSpacing: .7 },
  setCol: { width: "14%" }, inputCol: { width: "33%" }, doneCol: { width: "20%", textAlign: "center" },
  setRow: { flexDirection: "row", alignItems: "center", minHeight: 45, borderTopWidth: 1, borderTopColor: "#2b312b" },
  setRowDone: { backgroundColor: "#202a1d" }, setRowInvalid: { borderTopColor: "#7d443a" },
  setNumber: { color: "#aeb5ad", fontSize: 13, fontWeight: "700", paddingLeft: 6 }, setRole: { color: "#717971", fontSize: 6, fontWeight: "900", letterSpacing: .4, paddingLeft: 6 }, setRoleWorking: { color: "#d8ff38" },
  setToggle: { width: 25, height: 25, borderRadius: 5, borderColor: "#667063", borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginHorizontal: 13 },
  setToggleDone: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, setToggleDisabled: { opacity: .35 },
  setToggleText: { color: "#899188", fontSize: 14, fontWeight: "900" }, setToggleTextDone: { color: "#15200e" },
  setError: { color: "#e28b7d", fontSize: 9, fontWeight: "700", marginTop: -2, marginBottom: 7, marginLeft: "14%" },
  exerciseToggle: { height: 38, marginTop: 12, borderWidth: 1, borderColor: "#667063", borderRadius: 6, justifyContent: "center", alignItems: "center" },
  exerciseToggleDone: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, exerciseToggleText: { color: "#cbd1c9", fontSize: 10, fontWeight: "900", letterSpacing: .8 },
  exerciseToggleTextDone: { color: "#15200e" }, tip: { color: "#858d83", fontSize: 10, marginTop: 11, lineHeight: 14 },
  replace: { height: 34, borderRadius: 6, borderWidth: 1, borderColor: "#566052", justifyContent: "center", alignItems: "center", marginTop: 11 }, replaceText: { color: "#c2c9bf", fontSize: 9, fontWeight: "900", letterSpacing: .7 },
  setActions: { flexDirection: "row", gap: 7, marginTop: 11 }, addSet: { flex: 1, height: 36, borderRadius: 6, borderWidth: 1, borderColor: "#d8ff38", justifyContent: "center", alignItems: "center" }, addSetText: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .7 }, removeSet: { flex: 1, height: 36, borderRadius: 6, borderWidth: 1, borderColor: "#687166", justifyContent: "center", alignItems: "center" }, removeSetText: { color: "#b8c0b5", fontSize: 9, fontWeight: "900", letterSpacing: .6 },
  reason: { color: "#b9c99b", fontSize: 10, lineHeight: 15, marginTop: 11 },
  loadingType: { marginTop: 12 }, loadingLabel: { color: "#777f76", fontSize: 8, fontWeight: "900", letterSpacing: .8, marginBottom: 7 },
  loadingChoices: { flexDirection: "row", gap: 7 }, loadingChoice: { flex: 1, borderWidth: 1, borderColor: "#566052", borderRadius: 6, paddingVertical: 8, alignItems: "center" }, loadingChoiceActive: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, loadingChoiceText: { color: "#aeb5ad", fontSize: 8, fontWeight: "900", letterSpacing: .5 }, loadingChoiceTextActive: { color: "#15200e" },
});
