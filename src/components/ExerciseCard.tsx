import { useMemo } from "react";
import { Alert, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { displayExerciseWeight, displayWeight, exerciseWeightLabel, Exercise, isThreeByThreeExercise, isWorkingSet, LoadingType, progression, setValidationError, SetLog, storedExerciseWeight, storedWeight, WeightUnit, weightUnitLabel, workingSetStartIndex } from "../domain/training";
import { getExerciseDefinition } from "../domain/exerciseLibrary";
import { NumberOption, NumberPicker } from "./NumberPicker";

type ExerciseCardProps = {
  exercise: Exercise;
  number: number;
  editable: boolean;
  onChange: (id: string, set: number, changes: Partial<SetLog>) => void;
  onReplace?: (id: string) => void;
  onRemoveExercise?: (id: string) => void;
  onLoadingType?: (id: string, loadingType: LoadingType) => void;
  weightUnit: WeightUnit;
  onAddSet?: (id: string) => void;
  onRemoveSet?: (id: string) => void;
  onSetCompleted?: (exercise: Exercise) => void;
  expanded: boolean;
  highlighted?: boolean;
  onToggleExpanded: (id: string) => void;
  onExerciseCompleted?: (id: string) => void;
  onMove?: (id: string, direction: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onLayout?: (id: string, event: LayoutChangeEvent) => void;
  onWorkingLoadChange?: (id: string, weight: number) => void;
  supersetLabel?: string;
  supersetPartnerName?: string;
  canSupersetWithNext?: boolean;
  onToggleSuperset?: (id: string) => void;
};

export function ExerciseCard({ exercise, number, editable, onChange, onReplace, onRemoveExercise, onLoadingType, weightUnit, onAddSet, onRemoveSet, onSetCompleted, expanded, highlighted, onToggleExpanded, onExerciseCompleted, onMove, canMoveUp, canMoveDown, onLayout, onWorkingLoadChange, supersetLabel, supersetPartnerName, canSupersetWithNext, onToggleSuperset }: ExerciseCardProps) {
  const isComplete = exercise.sets.every((set) => set.completed);
  const toggleExercise = () => {
    if (!isComplete) {
      const invalidIndex = exercise.sets.findIndex((set, index) => Boolean(setValidationError(set, exercise, index)));
      if (invalidIndex >= 0) return Alert.alert("Check set values", setValidationError(exercise.sets[invalidIndex], exercise, invalidIndex) ?? "Enter valid values before completing this exercise.");
    }
    exercise.sets.forEach((_, index) => onChange(exercise.id, index, { completed: !isComplete }));
    if (!isComplete) {
      onSetCompleted?.(exercise);
      onExerciseCompleted?.(exercise.id);
    }
  };
  const updateSetValue = (set: SetLog, index: number, changes: Partial<SetLog>) => {
    const next = { ...set, ...changes };
    onChange(exercise.id, index, { ...changes, ...(set.completed && setValidationError(next, exercise, index) ? { completed: false } : {}) });
  };
  const warmupCount = workingSetStartIndex(exercise);
  const workingSetCount = exercise.sets.length - warmupCount;
  const definition = getExerciseDefinition(exercise.id);
  const isIsolation = definition?.modality === "isolation";
  const isThreeByThree = isThreeByThreeExercise(exercise);
  const maximumSelectableReps = definition?.modality === "isolation" ? 20 : definition?.modality === "compound" ? 10 : 12;
  const weightOptions = useMemo(() => buildWeightOptions(exercise, weightUnit), [exercise.sets, exercise.lastWeight, exercise.loadIncrement, exercise.loadingType, weightUnit]);
  const totalWeightOptions = useMemo(() => buildTotalWeightOptions(exercise.lastWeight, weightUnit), [exercise.lastWeight, weightUnit]);
  const warmupGuidance = WARMUP_GUIDANCE[exercise.id];
  return <View onLayout={(event) => onLayout?.(exercise.id, event)} style={[styles.card, exercise.supersetId && styles.cardSuperset, highlighted && styles.cardHighlighted, isComplete && styles.cardComplete]}>
    {supersetLabel && <View style={styles.supersetBanner}><Text style={styles.supersetLabel}>SUPERSET {supersetLabel}</Text><Text numberOfLines={1} style={styles.supersetPartner}>WITH {supersetPartnerName?.toUpperCase()}</Text></View>}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => onToggleExpanded(exercise.id)} style={[styles.exerciseHeader, !expanded && styles.exerciseHeaderCollapsed]}><View style={styles.headerMain}><View style={styles.exerciseLabelRow}><Text style={styles.exerciseNumber}>EXERCISE {String(number).padStart(2, "0")}</Text>{isComplete ? <Text style={styles.finishedBadge}>✓ FINISHED</Text> : highlighted ? <Text style={styles.nextBadge}>NEXT UP</Text> : null}</View><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseMeta}>{warmupCount ? `${warmupCount} warm-up · ` : ""}{workingSetCount} working · {isThreeByThree ? "3×3" : `${exercise.repRange[0]}–${exercise.repRange[1]} reps`}</Text></View><View style={styles.previous}><Text style={styles.previousLabel}>{isThreeByThree ? "LAST CONQUERED 3×3 · TOTAL" : exercise.loadingType === "plate-loaded" ? "WORKING LOAD / SIDE" : "WORKING LOAD"}</Text><Text style={styles.previousValue}>{isThreeByThree ? displayWeight(exercise.lastWeight, weightUnit) : displayExerciseWeight(exercise.lastWeight, exercise, weightUnit)} <Text style={styles.unit}>{isThreeByThree ? weightUnitLabel(weightUnit) : exerciseWeightLabel(exercise, weightUnit)}</Text> × {exercise.lastReps}</Text><Text style={styles.expand}>{expanded ? "COLLAPSE ︿" : "EXPAND ﹀"}</Text></View></Pressable>
    {expanded && <>{warmupGuidance && <View style={styles.warmupNote}><Text style={styles.warmupNoteTitle}>BEFORE THE PROGRAMMED SETS</Text><Text style={styles.warmupNoteText}>{warmupGuidance}</Text></View>}<View style={styles.tableHead}><Text style={[styles.head, styles.setCol]}>SET</Text><Text style={[styles.head, styles.inputCol]}>{exerciseWeightLabel(exercise, weightUnit).toUpperCase()}</Text><Text style={[styles.head, styles.inputCol]}>REPS</Text></View>
    {exercise.sets.map((set, index) => { const error = setValidationError(set, exercise, index); const working = isWorkingSet(exercise, index); return <View key={index}><View style={[styles.setRow, isComplete && styles.setRowDone, error && styles.setRowInvalid]}><View style={styles.setCol}><Text style={styles.setNumber}>{index + 1}</Text><Text style={[styles.setRole, working && styles.setRoleWorking]}>{working ? "WORK" : "WARM"}</Text></View><View style={styles.inputCol}><NumberPicker label={`${exercise.name} weight (${exerciseWeightLabel(exercise, weightUnit)})`} value={set.weight} startingValue={index ? exercise.sets[index - 1].weight : set.weight} options={weightOptions} disabled={!editable || isComplete} allowCustom onChange={(weight) => updateSetValue(set, index, { weight })} onCustomChange={(weight) => updateSetValue(set, index, { weight: storedExerciseWeight(weight, exercise, weightUnit) })} /></View><View style={styles.inputCol}><NumberPicker label={`${exercise.name} set ${index + 1} reps`} value={set.reps} options={REP_OPTIONS.filter((option) => option.value >= (isThreeByThree ? 3 : 6) && option.value <= (isThreeByThree ? (working ? 3 : 5) : maximumSelectableReps))} disabled={!editable || isComplete} onChange={(reps) => updateSetValue(set, index, { reps })} /></View></View>{editable && error && <Text style={styles.setError}>{error}</Text>}</View>; })}
    {isThreeByThree && onWorkingLoadChange && <View style={styles.loadingType}><Text style={styles.loadingLabel}>{editable ? "TODAY'S 3×3 TARGET" : "LAST CONQUERED 3×3"} · TOTAL INCLUDING 20 KG BAR</Text><NumberPicker label={`${exercise.name} ${editable ? "target" : "last conquered"} 3×3 total (${weightUnitLabel(weightUnit)})`} value={exercise.lastWeight} startingValue={exercise.lastWeight} options={totalWeightOptions} disabled={isComplete} allowCustom onChange={(weight) => onWorkingLoadChange(exercise.id, weight)} onCustomChange={(weight) => onWorkingLoadChange(exercise.id, storedWeight(weight, weightUnit))} /></View>}
    {editable && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isComplete }} onPress={toggleExercise} style={[styles.exerciseToggle, isComplete && styles.exerciseToggleDone]}><Text style={[styles.exerciseToggleText, isComplete && styles.exerciseToggleTextDone]}>{isComplete ? "✓ FINISHED · TAP TO REOPEN" : "FINISH EXERCISE"}</Text></Pressable>}
    {onMove && <View style={styles.moveActions}><Pressable disabled={!canMoveUp} onPress={() => onMove(exercise.id, -1)} style={[styles.moveButton, !canMoveUp && styles.moveDisabled]}><Text style={styles.moveText}>↑ MOVE UP</Text></Pressable><Pressable disabled={!canMoveDown} onPress={() => onMove(exercise.id, 1)} style={[styles.moveButton, !canMoveDown && styles.moveDisabled]}><Text style={styles.moveText}>↓ MOVE DOWN</Text></Pressable></View>}
    {onToggleSuperset && (exercise.supersetId || canSupersetWithNext) && <Pressable accessibilityRole="button" accessibilityLabel={exercise.supersetId ? `Unlink ${exercise.name} from ${supersetPartnerName}` : `Superset ${exercise.name} with the next exercise`} onPress={() => onToggleSuperset(exercise.id)} style={[styles.supersetButton, exercise.supersetId && styles.supersetButtonActive]}><Text style={[styles.supersetButtonText, exercise.supersetId && styles.supersetButtonTextActive]}>{exercise.supersetId ? "UNLINK SUPERSET" : "⚡ SUPERSET WITH NEXT EXERCISE"}</Text></Pressable>}
    {onLoadingType && !isThreeByThree && !exercise.loadingType && <View style={styles.loadingType}><Text style={styles.loadingLabel}>SELECT MACHINE LOADING · SAVED PERMANENTLY</Text><View style={styles.loadingChoices}>{(["pin-loaded", "plate-loaded"] as LoadingType[]).map((item) => <Pressable key={item} onPress={() => onLoadingType(exercise.id, item)} style={styles.loadingChoice}><Text style={styles.loadingChoiceText}>{item === "pin-loaded" ? "PIN LOADED" : "PLATE LOADED · PER SIDE"}</Text></Pressable>)}</View></View>}
    {!isIsolation && !isThreeByThree && (onAddSet || onRemoveSet) && <View style={styles.setActions}>{onRemoveSet && exercise.targetSets > 2 && <Pressable onPress={() => onRemoveSet(exercise.id)} style={styles.removeSet}><Text style={styles.removeSetText}>－ REMOVE SET</Text></Pressable>}{onAddSet && exercise.targetSets < 8 && <Pressable onPress={() => onAddSet(exercise.id)} style={styles.addSet}><Text style={styles.addSetText}>＋ ADD SET</Text></Pressable>}</View>}
    {onReplace && <Pressable onPress={() => onReplace(exercise.id)} style={styles.replace}><Text style={styles.replaceText}>REPLACE WITH ANY EXERCISE</Text></Pressable>}
    {onRemoveExercise && <Pressable onPress={() => onRemoveExercise(exercise.id)} style={styles.removeExercise}><Text style={styles.removeExerciseText}>REMOVE EXERCISE FROM WORKOUT</Text></Pressable>}
    {exercise.selectionReason && <Text style={styles.reason}>COACH: {exercise.selectionReason}</Text>}
    <Text style={styles.tip}>{progression(exercise, weightUnit)}</Text></>}
  </View>;
}

const REP_OPTIONS: NumberOption[] = Array.from({ length: 48 }, (_, index) => ({ value: index + 3, label: String(index + 3) }));

const WARMUP_GUIDANCE: Record<string, string> = {
  "conventional-deadlift": "5–8 min easy movement, then hip-hinge practice, glute activation, and 2–3 controlled empty-bar or very light sets. Brace hard and keep every warm-up fast; stop before fatigue.",
  "back-squat": "5–8 min easy movement, then ankle and hip mobility, bodyweight squats, and 2–3 controlled empty-bar sets. Practice depth and bracing without creating fatigue.",
  "belt-squat": "5 min easy movement, then knee and hip mobility plus 2–3 light belt-squat sets through a controlled full range. Increase load only when the movement feels stable.",
};

function buildWeightOptions(exercise: Exercise, unit: WeightUnit): NumberOption[] {
  const maximumStored = Math.max(exercise.loadingType === "plate-loaded" ? 600 : 300, exercise.lastWeight + storedExerciseWeight(20, exercise, unit));
  const maximumDisplayed = Math.ceil(displayExerciseWeight(maximumStored, exercise, unit));
  const displayedStep = 5;
  const values = Array.from({ length: Math.floor(maximumDisplayed / displayedStep) + 1 }, (_, index) => storedExerciseWeight(index * displayedStep, exercise, unit));
  exercise.sets.forEach((set) => { if (!values.includes(set.weight)) values.push(set.weight); });
  return values.sort((a, b) => a - b).map((value) => ({ value, label: String(displayExerciseWeight(value, exercise, unit)) }));
}

function buildTotalWeightOptions(currentWeight: number, unit: WeightUnit): NumberOption[] {
  const maximum = Math.max(300, currentWeight + 50);
  const values = [0, ...Array.from({ length: Math.floor((maximum - 20) / 5) + 1 }, (_, index) => 20 + index * 5)];
  if (!values.includes(currentWeight)) values.push(currentWeight);
  return values.sort((a, b) => a - b).map((value) => ({ value, label: String(displayWeight(value, unit)) }));
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#1a1f1a", borderRadius: 10, borderWidth: 1, borderColor: "transparent", padding: 15, marginTop: 14 }, cardSuperset: { borderColor: "#5d7025" }, cardHighlighted: { borderColor: "#d8ff38", backgroundColor: "#1d2419" }, cardComplete: { borderColor: "#6f8b31", backgroundColor: "#26331f" },
  supersetBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#29351c", borderRadius: 6, paddingHorizontal: 9, paddingVertical: 7, marginBottom: 12 }, supersetLabel: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .8 }, supersetPartner: { color: "#9eaa94", fontSize: 7, fontWeight: "800", letterSpacing: .5, maxWidth: "58%" },
  exerciseHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }, exerciseHeaderCollapsed: { marginBottom: 0 }, headerMain: { flex: 1, paddingRight: 8 },
  exerciseLabelRow: { flexDirection: "row", alignItems: "center", gap: 7 }, exerciseNumber: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 }, nextBadge: { color: "#15190f", backgroundColor: "#d8ff38", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, fontSize: 7, fontWeight: "900", letterSpacing: .6 }, finishedBadge: { color: "#d8ff38", backgroundColor: "#293322", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, fontSize: 7, fontWeight: "900", letterSpacing: .6 },
  exerciseName: { color: "#f3f5f1", fontSize: 17, fontWeight: "800", marginTop: 3 },
  exerciseMeta: { color: "#8b9489", fontSize: 11, marginTop: 3 },
  previous: { alignItems: "flex-end" }, previousLabel: { color: "#717971", fontSize: 8, fontWeight: "800", letterSpacing: .8 },
  previousValue: { color: "#ebeee8", fontSize: 12, fontWeight: "700", marginTop: 4 }, unit: { color: "#929a91" }, expand: { color: "#d8ff38", fontSize: 7, fontWeight: "900", marginTop: 9 },
  tableHead: { flexDirection: "row", paddingBottom: 7 }, head: { color: "#777f76", fontSize: 9, fontWeight: "800", letterSpacing: .7 },
  warmupNote: { backgroundColor: "#20271d", borderLeftColor: "#d8ff38", borderLeftWidth: 3, borderRadius: 7, padding: 11, marginBottom: 13 }, warmupNoteTitle: { color: "#d8ff38", fontSize: 8, fontWeight: "900", letterSpacing: .8 }, warmupNoteText: { color: "#b5bdb1", fontSize: 10, lineHeight: 15, marginTop: 5 },
  setCol: { width: "20%" }, inputCol: { width: "40%" },
  setRow: { flexDirection: "row", alignItems: "center", minHeight: 45, borderTopWidth: 1, borderTopColor: "#2b312b" },
  setRowDone: { backgroundColor: "#202a1d" }, setRowInvalid: { borderTopColor: "#7d443a" },
  setNumber: { color: "#aeb5ad", fontSize: 13, fontWeight: "700", paddingLeft: 6 }, setRole: { color: "#717971", fontSize: 6, fontWeight: "900", letterSpacing: .4, paddingLeft: 6 }, setRoleWorking: { color: "#d8ff38" },
  setError: { color: "#e28b7d", fontSize: 9, fontWeight: "700", marginTop: -2, marginBottom: 7, marginLeft: "14%" },
  exerciseToggle: { height: 38, marginTop: 12, borderWidth: 1, borderColor: "#667063", borderRadius: 6, justifyContent: "center", alignItems: "center" },
  exerciseToggleDone: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, exerciseToggleText: { color: "#cbd1c9", fontSize: 10, fontWeight: "900", letterSpacing: .8 },
  exerciseToggleTextDone: { color: "#15200e" }, tip: { color: "#858d83", fontSize: 10, marginTop: 11, lineHeight: 14 },
  moveActions: { flexDirection: "row", gap: 7, marginTop: 11 }, moveButton: { flex: 1, height: 34, borderRadius: 6, borderWidth: 1, borderColor: "#687166", justifyContent: "center", alignItems: "center" }, moveDisabled: { opacity: .25 }, moveText: { color: "#c2c9bf", fontSize: 8, fontWeight: "900", letterSpacing: .6 },
  supersetButton: { height: 36, borderRadius: 6, borderWidth: 1, borderColor: "#809b25", justifyContent: "center", alignItems: "center", marginTop: 8 }, supersetButtonActive: { backgroundColor: "#29351c" }, supersetButtonText: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .6 }, supersetButtonTextActive: { color: "#b8c78a" },
  replace: { height: 34, borderRadius: 6, borderWidth: 1, borderColor: "#566052", justifyContent: "center", alignItems: "center", marginTop: 11 }, replaceText: { color: "#c2c9bf", fontSize: 9, fontWeight: "900", letterSpacing: .7 },
  removeExercise: { height: 34, borderRadius: 6, borderWidth: 1, borderColor: "#74463f", justifyContent: "center", alignItems: "center", marginTop: 8 }, removeExerciseText: { color: "#d99488", fontSize: 9, fontWeight: "900", letterSpacing: .7 },
  setActions: { flexDirection: "row", gap: 7, marginTop: 11 }, addSet: { flex: 1, height: 36, borderRadius: 6, borderWidth: 1, borderColor: "#d8ff38", justifyContent: "center", alignItems: "center" }, addSetText: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .7 }, removeSet: { flex: 1, height: 36, borderRadius: 6, borderWidth: 1, borderColor: "#687166", justifyContent: "center", alignItems: "center" }, removeSetText: { color: "#b8c0b5", fontSize: 9, fontWeight: "900", letterSpacing: .6 },
  reason: { color: "#b9c99b", fontSize: 10, lineHeight: 15, marginTop: 11 },
  loadingType: { marginTop: 12 }, loadingLabel: { color: "#777f76", fontSize: 8, fontWeight: "900", letterSpacing: .8, marginBottom: 7 },
  loadingChoices: { flexDirection: "row", gap: 7 }, loadingChoice: { flex: 1, borderWidth: 1, borderColor: "#566052", borderRadius: 6, paddingVertical: 8, alignItems: "center" }, loadingChoiceActive: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, loadingChoiceText: { color: "#aeb5ad", fontSize: 8, fontWeight: "900", letterSpacing: .5 }, loadingChoiceTextActive: { color: "#15200e" },
});
