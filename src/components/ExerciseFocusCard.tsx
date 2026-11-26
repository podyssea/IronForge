import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { displayExerciseWeight, exerciseWeightLabel, Exercise, ExerciseSummaryChanges, storedExerciseWeight, WeightUnit } from "../domain/training";
import { getExerciseDefinition } from "../domain/exerciseLibrary";
import { calculateDeadliftPlan, CONVENTIONAL_DEADLIFT_ID, DEADLIFT_BAR_KG, DEADLIFT_LOAD_STEP_KG, DEADLIFT_REP_SCHEMES, deadliftWeightPerSide, isDeadliftWorkingWeight } from "../domain/deadlift";
import { NumberPicker } from "./NumberPicker";

type ExerciseFocusCardProps = {
  exercise: Exercise;
  position: number;
  total: number;
  weightUnit: WeightUnit;
  deload?: boolean;
  replacementDropdown?: ReactNode;
  onChange: (changes: ExerciseSummaryChanges) => void;
  onComplete: () => void;
  onReopen: () => void;
  onReplace: () => void;
  onRemove?: () => void;
};

export function ExerciseFocusCard({ exercise, position, total, weightUnit, deload, replacementDropdown, onChange, onComplete, onReopen, onReplace, onRemove }: ExerciseFocusCardProps) {
  const first = exercise.sets[0] ?? { weight: exercise.lastWeight, reps: null, completed: false };
  const completed = exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
  const setCount = Math.max(1, exercise.sets.length);
  const isDeadlift = exercise.id === CONVENTIONAL_DEADLIFT_ID;
  const inputs = exercise.deadliftCalculator;
  const deadliftPlan = isDeadlift ? calculateDeadliftPlan(inputs?.schemeId, inputs?.referenceTripleKg, deload) : undefined;
  const displayWeight = displayExerciseWeight(first.weight, exercise, weightUnit);
  const bodyweightOnly = first.weight === 0 && getExerciseDefinition(exercise.id)?.equipment.includes("bodyweight");
  const displayStep = weightUnit === "lb" ? 5 : 2.5;
  const updateDisplayedWeight = (next: number) => onChange({ workingWeight: storedExerciseWeight(Math.max(0, next), exercise, weightUnit) });
  const workingWeightLabel = bodyweightOnly ? "Bodyweight" : `${displayWeight} ${exerciseWeightLabel(exercise, weightUnit)}`;
  const completionLabel = isDeadlift ? "Complete exercise" : `Complete · ${setCount} ${setCount === 1 ? "set" : "sets"} at ${workingWeightLabel}`;
  const exerciseActions = <>
    <View style={styles.secondary}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: Boolean(replacementDropdown) }} onPress={onReplace} style={styles.secondaryButton}><Text style={styles.secondaryText}>CHANGE EXERCISE</Text></Pressable>
      {onRemove && <Pressable accessibilityRole="button" onPress={onRemove} style={styles.removeButton}><Text style={styles.removeText}>REMOVE</Text></Pressable>}
    </View>
    {replacementDropdown}
  </>;

  return <View style={[styles.card, completed && styles.cardCompleted]}>
    <View style={styles.topline}><Text style={styles.position}>EXERCISE {position} OF {total}</Text>{completed ? <Text style={styles.doneBadge}>✓ COMPLETED</Text> : <Text style={styles.focusBadge}>IN FOCUS</Text>}</View>
    <Text accessibilityRole="header" style={styles.name}>{exercise.name}</Text>
    {!isDeadlift && <Text style={styles.hint}>Confirm the working weight and total sets. No input is needed between sets.</Text>}

    {isDeadlift ? <>
      {exerciseActions}
      {completed ? <DeadliftSetList title="Logged working sets" sets={exercise.sets} /> : <View style={styles.controls}>
        <DeadliftCalculator inputs={inputs} plan={deadliftPlan} deload={deload} onChange={onChange} />
      </View>}
    </> : <>
      <View style={styles.controls}>
        <Stepper
          label="WORKING WEIGHT"
          value={bodyweightOnly ? "BODYWEIGHT" : `${displayWeight}`}
          unit={bodyweightOnly ? "external load" : exerciseWeightLabel(exercise, weightUnit)}
          decreaseLabel={`Decrease ${exercise.name} working weight`}
          increaseLabel={`Increase ${exercise.name} working weight`}
          disabled={completed}
          onDecrease={() => updateDisplayedWeight(displayWeight - displayStep)}
          onIncrease={() => updateDisplayedWeight(displayWeight + displayStep)}
        />
        <Stepper
          label="TOTAL SETS"
          value={`${setCount}`}
          unit={setCount === 1 ? "set" : "sets"}
          decreaseLabel={`Decrease ${exercise.name} set count`}
          increaseLabel={`Increase ${exercise.name} set count`}
          disabled={completed}
          onDecrease={() => onChange({ workingSetCount: Math.max(1, setCount - 1) })}
          onIncrease={() => onChange({ workingSetCount: Math.min(20, setCount + 1) })}
        />
      </View>

      {first.reps === null ? <Pressable disabled={completed} accessibilityRole="button" onPress={() => onChange({ representativeReps: exercise.lastReps })} style={[styles.repsToggle, completed && styles.disabled]}><Text style={styles.repsToggleText}>＋ TRACK REPS (OPTIONAL)</Text></Pressable> : <View style={styles.repsRow}><Stepper label="REPRESENTATIVE REPS" value={`${first.reps}`} unit="reps" decreaseLabel={`Decrease ${exercise.name} reps`} increaseLabel={`Increase ${exercise.name} reps`} disabled={completed} onDecrease={() => onChange({ representativeReps: Math.max(1, first.reps! - 1) })} onIncrease={() => onChange({ representativeReps: Math.min(100, first.reps! + 1) })} /><Pressable disabled={completed} onPress={() => onChange({ representativeReps: null })} style={[styles.removeReps, completed && styles.disabled]}><Text style={styles.removeRepsText}>STOP TRACKING REPS</Text></Pressable></View>}
    </>}

    {completed ? <Pressable accessibilityRole="button" onPress={onReopen} style={styles.reopen}><Text style={styles.reopenText}>REOPEN EXERCISE</Text></Pressable>
      : (!isDeadlift || deadliftPlan) && <Pressable accessibilityRole="button" accessibilityLabel={completionLabel} onPress={onComplete} style={styles.complete}><Text style={styles.completeText}>{completionLabel.toUpperCase()}</Text><Text style={styles.completeArrow}>→</Text></Pressable>}

    {!isDeadlift && exerciseActions}
  </View>;
}

function nearbyDeadliftWeights(weight: number) {
  if (!isDeadliftWorkingWeight(weight)) return [];
  return [-2, -1, 0, 1, 2]
    .map((step) => weight + step * DEADLIFT_LOAD_STEP_KG)
    .filter(isDeadliftWorkingWeight)
    .map((value) => ({ value, label: String(value) }));
}

function DeadliftCalculator({ inputs, plan, deload, onChange }: {
  inputs: Exercise["deadliftCalculator"];
  plan: ReturnType<typeof calculateDeadliftPlan>;
  deload?: boolean;
  onChange: ExerciseFocusCardProps["onChange"];
}) {
  const reference = inputs?.referenceTripleKg;

  return <View style={styles.calculator}>
    <Text accessibilityRole="header" style={styles.heading}>Rep scheme</Text>
    <View style={styles.schemes}>
      {DEADLIFT_REP_SCHEMES.map(({ id, label }) => {
        const selected = id === inputs?.schemeId;
        return <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected }}
          onPress={() => onChange({ deadliftCalculator: { schemeId: id } })}
          style={[styles.scheme, selected && styles.schemeSelected]}>
          <Text style={styles.schemeLabel}>{label}</Text>
        </Pressable>;
      })}
    </View>
    <Text style={styles.controlLabel}>COMPLETED TRIPLE · TOTAL WEIGHT</Text>
    <NumberPicker label="Completed set of 3 in kg total, 5 kg increments" value={reference ?? 0}
      options={nearbyDeadliftWeights(reference ?? 0)} valueLabel={reference === undefined ? "Enter triple weight" : `${reference} kg × 3`}
      customPlaceholder="e.g. 160 kg total" allowCustom validateCustom={isDeadliftWorkingWeight}
      onChange={(referenceTripleKg) => onChange({ deadliftCalculator: { referenceTripleKg } })} />
    <Text style={styles.plateLoad}>{DEADLIFT_BAR_KG} kg bar included · {DEADLIFT_LOAD_STEP_KG} kg total steps</Text>
    {plan && <>
      <DeadliftSetList title="Warm-up sets" sets={plan.warmups} />
      <DeadliftSetList title={deload ? "Deload working sets" : "Working sets"} sets={plan.workingSets} />
    </>}
  </View>;
}

function DeadliftSetList({ title, sets }: { title: string; sets: readonly { weight: number; reps: number | null }[] }) {
  return <View style={styles.setList}>
    <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
    {sets.map(({ weight, reps }, index) => <View key={index} style={styles.setRow}>
      <Text style={styles.setWeight}>{index + 1}. {weight} kg{reps === null ? "" : ` × ${reps}`}</Text>
      {weight >= DEADLIFT_BAR_KG && <Text style={styles.plateLoad}>{deadliftWeightPerSide(weight)} kg per side</Text>}
    </View>)}
    {sets.length === 0 && <Text style={styles.plateLoad}>Working weight is the empty bar.</Text>}
  </View>;
}

function Stepper({ label, value, unit, decreaseLabel, increaseLabel, disabled, onDecrease, onIncrease }: { label: string; value: string; unit: string; decreaseLabel: string; increaseLabel: string; disabled: boolean; onDecrease: () => void; onIncrease: () => void }) {
  return <View style={styles.stepper}>
    <Text style={styles.controlLabel}>{label}</Text>
    <View style={styles.stepperRow}><Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={decreaseLabel} onPress={onDecrease} style={[styles.stepButton, disabled && styles.disabled]}><Text style={styles.stepButtonText}>−</Text></Pressable><View accessible accessibilityLabel={`${label}: ${value} ${unit}`} style={styles.value}><Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.valueText}>{value}</Text><Text style={styles.unit}>{unit}</Text></View><Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={increaseLabel} onPress={onIncrease} style={[styles.stepButton, disabled && styles.disabled]}><Text style={styles.stepButtonText}>＋</Text></Pressable></View>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#1d2419", borderWidth: 2, borderColor: "#d8ff38", borderRadius: 14, padding: 16, marginTop: 16 },
  cardCompleted: { backgroundColor: "#24301f", borderColor: "#6f8b31" },
  topline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  position: { color: "#939c90", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  focusBadge: { color: "#15190f", backgroundColor: "#d8ff38", borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5, fontSize: 8, fontWeight: "900", letterSpacing: .7 },
  doneBadge: { color: "#d8ff38", backgroundColor: "#344229", borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5, fontSize: 8, fontWeight: "900", letterSpacing: .7 },
  name: { color: "#f7f9f4", fontSize: 28, fontWeight: "900", marginTop: 10 },
  hint: { color: "#a6afa3", fontSize: 12, lineHeight: 18, marginTop: 7 },
  calculator: { backgroundColor: "#171c16", borderRadius: 9, borderColor: "#566052", borderWidth: 1, padding: 12 },
  heading: { color: "#f7faf3", fontSize: 15, fontWeight: "800" },
  schemes: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8, marginBottom: 14 },
  scheme: { borderWidth: 1, borderColor: "#566052", borderRadius: 7, paddingHorizontal: 11, paddingVertical: 8, minHeight: 44, justifyContent: "center" },
  schemeSelected: { backgroundColor: "#2c3a23", borderColor: "#d8ff38" },
  schemeLabel: { color: "#f7faf3", fontSize: 13, fontWeight: "700" },
  setList: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#566052", marginTop: 10, paddingTop: 10, gap: 4 },
  setRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 6, paddingVertical: 4 },
  setWeight: { color: "#f7faf3", fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  plateLoad: { color: "#b9c1b6", fontSize: 12, fontVariant: ["tabular-nums"] },
  controls: { gap: 11, marginTop: 18 },
  stepper: { flex: 1 }, controlLabel: { color: "#899286", fontSize: 8, fontWeight: "900", letterSpacing: .9, marginBottom: 6 },
  stepperRow: { flexDirection: "row", alignItems: "stretch", minHeight: 64 },
  stepButton: { width: 64, minHeight: 64, borderWidth: 1, borderColor: "#677260", backgroundColor: "#171c16", alignItems: "center", justifyContent: "center", borderRadius: 9 },
  stepButtonText: { color: "#d8ff38", fontSize: 30, fontWeight: "500" },
  value: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 }, valueText: { color: "#f7faf3", fontSize: 32, fontWeight: "900" }, unit: { color: "#949d91", fontSize: 9, fontWeight: "800", marginTop: -2 },
  repsToggle: { minHeight: 46, borderWidth: 1, borderColor: "#566052", borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 14 }, repsToggleText: { color: "#b9c1b6", fontSize: 9, fontWeight: "900", letterSpacing: .7 },
  repsRow: { marginTop: 14 }, removeReps: { minHeight: 40, alignItems: "center", justifyContent: "center" }, removeRepsText: { color: "#939c91", fontSize: 8, fontWeight: "900", letterSpacing: .7 },
  complete: { minHeight: 62, borderRadius: 10, backgroundColor: "#d8ff38", marginTop: 16, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, completeText: { color: "#15190f", flex: 1, fontSize: 12, fontWeight: "900", letterSpacing: .5 }, completeArrow: { color: "#15190f", fontSize: 24, fontWeight: "800", marginLeft: 8 },
  reopen: { minHeight: 52, borderRadius: 9, borderWidth: 1, borderColor: "#d8ff38", marginTop: 16, alignItems: "center", justifyContent: "center" }, reopenText: { color: "#d8ff38", fontSize: 10, fontWeight: "900", letterSpacing: .8 },
  secondary: { flexDirection: "row", gap: 8, marginTop: 12 }, secondaryButton: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: "#596357", borderRadius: 8, alignItems: "center", justifyContent: "center" }, secondaryText: { color: "#c1c8be", fontSize: 8, fontWeight: "900", letterSpacing: .6 }, removeButton: { minWidth: 82, minHeight: 44, borderWidth: 1, borderColor: "#74463f", borderRadius: 8, alignItems: "center", justifyContent: "center" }, removeText: { color: "#d99488", fontSize: 8, fontWeight: "900", letterSpacing: .6 },
  disabled: { opacity: .35 },
});
