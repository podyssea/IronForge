import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { displayWeight, SetLog, WeightUnit, weightUnitLabel } from "../domain/training";
import { BackfillSetPatch, WorkoutBackfillDraft } from "../domain/workoutBackfill";
import { BackfillExerciseCard } from "./BackfillExerciseCard";

type MissedWorkoutEditorProps = {
  draft: WorkoutBackfillDraft;
  weightUnit: WeightUnit;
  isSaving: boolean;
  errorMessage?: string;
  onSetChange: (exerciseId: string, setIndex: number, patch: BackfillSetPatch) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setIndex: number) => void;
  onNotesChange: (notes: string) => void;
  onChangeSource: () => void;
  onSave: () => void;
  onCancel: () => void;
};

export function MissedWorkoutEditor({ draft, weightUnit, isSaving, errorMessage, onSetChange, onAddSet, onRemoveSet, onNotesChange, onChangeSource, onSave, onCancel }: MissedWorkoutEditorProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const totals = useMemo(() => draft.exercises.reduce((result, exercise) => ({
    sets: result.sets + exercise.sets.filter((set) => set.completed).length,
    volume: result.volume + exercise.sets.filter((set) => set.completed).reduce((sum, set) => sum + set.weight * set.reps, 0),
  }), { sets: 0, volume: 0 }), [draft.exercises]);
  const formattedDate = formatCalendarDate(draft.performedOn);
  const sourceDescription = draft.source.type === "planned" ? "Copied from your current plan" : "Copied from workout history";
  const toggle = (exerciseId: string) => setExpandedIds((current) => {
    const next = new Set(current);
    if (next.has(exerciseId)) next.delete(exerciseId); else next.add(exerciseId);
    return next;
  });
  return <View>
    <Pressable accessibilityRole="button" onPress={onChangeSource} style={styles.back}><Text style={styles.backText}>← CHANGE DATE OR SOURCE</Text></Pressable>
    <Text style={styles.kicker}>MISSED WORKOUT · {formattedDate.toUpperCase()}</Text>
    <Text accessibilityRole="header" style={styles.title}>{draft.workoutTitle.split(" · ").pop()}</Text>
    <Text style={styles.source}>{sourceDescription}</Text>
    <View style={styles.summary}><Summary value={`${totals.sets}`} label="SETS INCLUDED" /><View style={styles.divider}/><Summary value={`${displayWeight(totals.volume, weightUnit).toLocaleString()} ${weightUnitLabel(weightUnit)}`} label="VOLUME" /></View>
    <Text style={styles.section}>EXERCISES · TAP ONLY WHAT CHANGED</Text>
    {draft.exercises.map((exercise) => <BackfillExerciseCard key={exercise.id} exercise={exercise} expanded={expandedIds.has(exercise.id)} weightUnit={weightUnit} onToggle={() => toggle(exercise.id)} onSetChange={(setIndex, patch) => onSetChange(exercise.id, setIndex, patch as Partial<SetLog>)} onAddSet={() => onAddSet(exercise.id)} onRemoveSet={(setIndex) => onRemoveSet(exercise.id, setIndex)} />)}
    <View style={styles.notes}><Text style={styles.notesLabel}>SESSION NOTES · OPTIONAL</Text><TextInput accessibilityLabel="Session notes" value={draft.notes} onChangeText={onNotesChange} placeholder="Anything worth remembering about this workout?" placeholderTextColor="#687067" multiline style={styles.notesInput} /></View>
    <View style={styles.saveSummary}><Text style={styles.saveCount}>{totals.sets} SETS</Text><Text style={styles.saveDate}>{formattedDate.toUpperCase()}</Text></View>
    {errorMessage ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{errorMessage}</Text> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: isSaving }} disabled={isSaving} onPress={onSave} style={({ pressed }) => [styles.save, pressed && styles.savePressed, isSaving && styles.disabled]}><Text style={styles.saveText}>{isSaving ? "SAVING WORKOUT…" : "SAVE MISSED WORKOUT"}</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={isSaving} onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>CANCEL</Text></Pressable>
  </View>;
}

function Summary({ value, label }: { value: string; label: string }) {
  return <View style={styles.summaryItem}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function formatCalendarDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

const styles = StyleSheet.create({
  back: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", marginTop: 10 }, backText: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .7 }, kicker: { color: "#8d958c", fontSize: 9, fontWeight: "900", letterSpacing: 1.1, marginTop: 14 }, title: { color: "#f8faf5", fontSize: 28, fontWeight: "900", marginTop: 4 }, source: { color: "#aab3a7", fontSize: 11, marginTop: 5 },
  summary: { minHeight: 78, backgroundColor: "#1a1f1a", borderRadius: 9, padding: 15, flexDirection: "row", alignItems: "center", marginTop: 16 }, summaryItem: { flex: 1 }, divider: { width: 1, height: 36, backgroundColor: "#303730", marginHorizontal: 14 }, summaryValue: { color: "#f3f5f1", fontSize: 21, fontWeight: "900" }, summaryLabel: { color: "#7d857c", fontSize: 8, fontWeight: "900", letterSpacing: .7, marginTop: 4 }, section: { color: "#90988e", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 22, marginBottom: 1 },
  notes: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 13, marginTop: 16 }, notesLabel: { color: "#90988e", fontSize: 8, fontWeight: "900", letterSpacing: .7 }, notesInput: { minHeight: 64, color: "#eef1eb", fontSize: 13, lineHeight: 19, textAlignVertical: "top", marginTop: 7 }, saveSummary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22 }, saveCount: { color: "#d8ff38", fontSize: 10, fontWeight: "900", letterSpacing: .8 }, saveDate: { color: "#aab3a7", fontSize: 9, fontWeight: "800" }, error: { color: "#ffd6cf", backgroundColor: "#3b211d", borderColor: "#8b4e44", borderWidth: 1, borderRadius: 7, padding: 11, fontSize: 11, lineHeight: 16, fontWeight: "700", marginTop: 10 },
  save: { minHeight: 56, borderRadius: 9, backgroundColor: "#d8ff38", alignItems: "center", justifyContent: "center", marginTop: 10 }, savePressed: { backgroundColor: "#b9db31" }, saveText: { color: "#15190f", fontSize: 12, fontWeight: "900", letterSpacing: .9 }, disabled: { opacity: .45 }, cancel: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: "#626b5f", alignItems: "center", justifyContent: "center", marginTop: 8 }, cancelText: { color: "#b8c0b5", fontSize: 9, fontWeight: "900", letterSpacing: .8 },
});
