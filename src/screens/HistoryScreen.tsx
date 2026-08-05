import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { compareSessionExercises, exerciseVolume, formatDuration, groupRecordsByWeek } from "../domain/sessionJournal";
import { displayExerciseWeight, displayWeight, exerciseWeightLabel, Exercise, isWorkingSet, SessionRecord, WeightUnit, weightUnitLabel } from "../domain/training";

type HistoryScreenProps = {
  records: SessionRecord[];
  onUpdateNotes: (recordId: string, notes: string) => void;
  onDelete: (recordId: string) => void;
  weightUnit: WeightUnit;
  onRepeat: (record: SessionRecord, deload?: boolean) => void;
};

export function HistoryScreen({ records, onUpdateNotes, onDelete, weightUnit, onRepeat }: HistoryScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = records.find((record) => record.id === selectedId);
  if (selected) return <SessionDetail record={selected} records={records} weightUnit={weightUnit} onBack={() => setSelectedId(null)} onRepeat={() => onRepeat(selected)} onRepeatDeload={() => onRepeat(selected, true)} onNotes={(notes) => onUpdateNotes(selected.id, notes)} onDelete={() => Alert.alert("Delete workout?", "This removes the session from your journal and totals. Current program loads will not be changed.", [{ text: "Keep session", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => { onDelete(selected.id); setSelectedId(null); } }])} />;

  const weeklyGroups = groupRecordsByWeek(records);
  return <><Text style={styles.kicker}>WORKOUT JOURNAL</Text><Text style={styles.title}>History</Text>
    {records.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No workouts saved yet</Text><Text style={styles.emptyText}>Finish a workout and it will appear here with every set, your notes, and performance changes.</Text></View> : <>
      <View style={styles.historyStat}><Text style={styles.historyNumber}>{records.length}</Text><Text style={styles.historyLabel}>WORKOUTS COMPLETED</Text><Text style={styles.historyVolume}>{displayWeight(records.reduce((sum, record) => sum + record.volume, 0), weightUnit).toLocaleString()} {weightUnitLabel(weightUnit)} total volume</Text></View>
      {weeklyGroups.map((group) => <View key={group.key}><Text style={styles.sectionLabel}>{group.label}</Text>{group.records.map((record) => <Pressable key={record.id} onPress={() => setSelectedId(record.id)} style={styles.historyCard}><View style={styles.cardCopy}><Text style={styles.historyTitle}>{record.workoutTitle.split(" · ").pop()}</Text>{record.deload ? <Text style={styles.deloadTag}>DELOAD · 75%</Text> : null}<Text style={styles.historyDate}>{formatDate(record.completedAt)} · {record.exercises.filter((exercise) => exercise.sets.some((set) => set.completed)).length} exercises</Text>{record.notes ? <Text numberOfLines={1} style={styles.notePreview}>{record.notes}</Text> : null}</View><View style={styles.cardRight}><Text style={styles.cardVolume}>{displayWeight(record.volume, weightUnit).toLocaleString()}<Text style={styles.cardUnit}> {weightUnitLabel(weightUnit)}</Text></Text><Text style={styles.open}>OPEN →</Text></View></Pressable>)}</View>)}</>}
  </>;
}

function SessionDetail({ record, records, weightUnit, onBack, onRepeat, onRepeatDeload, onNotes, onDelete }: { record: SessionRecord; records: SessionRecord[]; weightUnit: WeightUnit; onBack: () => void; onRepeat: () => void; onRepeatDeload: () => void; onNotes: (notes: string) => void; onDelete: () => void }) {
  const comparisons = compareSessionExercises(record, records);
  const completedSets = record.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.completed).length, 0);
  const totalSets = record.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  return <><Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>← BACK TO HISTORY</Text></Pressable><Text style={styles.kicker}>JOURNAL ENTRY</Text><Text style={styles.title}>{record.workoutTitle.split(" · ").pop()}</Text>{record.deload ? <Text style={styles.deloadTag}>DELOAD · 75%</Text> : null}<Text style={styles.detailDate}>{formatDate(record.completedAt)} · {record.startedAt ? `${formatTime(record.startedAt)}–${formatTime(record.completedAt)}` : formatTime(record.completedAt)}</Text>
    <View style={styles.detailStats}><Stat value={`${completedSets}/${totalSets}`} label="SETS" /><Stat value={`${displayWeight(record.volume, weightUnit).toLocaleString()} ${weightUnitLabel(weightUnit)}`} label="VOLUME" /><Stat value={formatDuration(record.durationSeconds)} label="DURATION" /></View>
    <Pressable onPress={onRepeat} style={styles.repeat}><Text style={styles.repeatText}>↻ REPEAT THIS WORKOUT</Text></Pressable>
    <Pressable onPress={onRepeatDeload} style={styles.repeatDeload}><Text style={styles.repeatDeloadText}>DELOAD REPEAT · 75%</Text></Pressable>
    <View style={styles.notes}><Text style={styles.notesLabel}>SESSION NOTES</Text><TextInput value={record.notes ?? ""} onChangeText={onNotes} placeholder="Add notes about this workout" placeholderTextColor="#687067" multiline style={styles.notesInput} /></View>
    <Text style={styles.sectionLabel}>EXERCISES & SETS</Text>{record.exercises.map((exercise) => { const comparison = comparisons.get(exercise.id); return <View key={exercise.id} style={styles.exerciseCard}><View style={styles.exerciseTop}><View><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseVolume}>{displayWeight(exerciseVolume(exercise), weightUnit).toLocaleString()} {weightUnitLabel(weightUnit)} exercise volume</Text></View><Text style={styles.exerciseCount}>{exercise.sets.filter((set) => set.completed).length}/{exercise.sets.length}</Text></View>{exercise.sets.map((set, index) => <View key={index} style={[styles.setRow, !set.completed && styles.skippedRow]}><Text style={[styles.setIndex, isWorkingSet(exercise, index) && styles.workingSet]}>SET {index + 1} · {isWorkingSet(exercise, index) ? "WORK" : "WARM"}</Text><Text style={styles.setValue}>{displayExerciseWeight(set.weight, exercise, weightUnit)} {exerciseWeightLabel(exercise, weightUnit)} × {set.reps}</Text><Text style={[styles.setStatus, !set.completed && styles.skipped]}>{set.completed ? `${displayWeight(set.weight * set.reps, weightUnit).toLocaleString()} ${weightUnitLabel(weightUnit)}` : "SKIPPED"}</Text></View>)}<Text style={styles.comparison}>{comparison?.previousFound ? comparisonText(comparison.weightChange, comparison.repChange, comparison.volumeChange, exercise, weightUnit) : "First recorded performance for this exercise"}</Text></View>; })}
    <Pressable onPress={onDelete} style={styles.delete}><Text style={styles.deleteText}>DELETE JOURNAL ENTRY</Text></Pressable>
  </>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function comparisonText(weight: number, reps: number, volume: number, exercise: Exercise, unit: WeightUnit): string {
  const parts = [`${signed(displayExerciseWeight(weight, exercise, unit))} ${exerciseWeightLabel(exercise, unit)}`, `${signed(reps)} reps`, `${signed(displayWeight(volume, unit))} ${weightUnitLabel(unit)} volume`];
  return `Vs previous: ${parts.join(" · ")}`;
}

function signed(value: number): string { return value > 0 ? `+${value}` : String(value); }
function formatDate(value: string): string { return new Date(value).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }
function formatTime(value: string): string { return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }

const styles = StyleSheet.create({
  kicker: { color: "#8d958c", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 30 }, title: { color: "#f8faf5", fontSize: 34, fontWeight: "800", marginTop: 4 },
  empty: { backgroundColor: "#1a1f1a", borderRadius: 10, padding: 22, marginTop: 20 }, emptyTitle: { color: "#f4f6f1", fontSize: 17, fontWeight: "800" }, emptyText: { color: "#8d958b", fontSize: 12, lineHeight: 18, marginTop: 8 },
  historyStat: { backgroundColor: "#1a1f1a", borderRadius: 10, marginTop: 18, padding: 18 }, historyNumber: { color: "#d8ff38", fontSize: 34, fontWeight: "900" }, historyLabel: { color: "#7d857c", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 3 }, historyVolume: { color: "#dce1db", fontSize: 13, fontWeight: "700", marginTop: 14 },
  sectionLabel: { color: "#90988e", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginTop: 26, marginBottom: 8 },
  historyCard: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 15, marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, cardCopy: { flex: 1, paddingRight: 10 }, historyTitle: { color: "#eff2ed", fontSize: 15, fontWeight: "800" }, historyDate: { color: "#858d83", fontSize: 11, marginTop: 5 }, notePreview: { color: "#aab3a7", fontSize: 10, fontStyle: "italic", marginTop: 6 }, cardRight: { alignItems: "flex-end" }, cardVolume: { color: "#d8ff38", fontSize: 17, fontWeight: "900" }, cardUnit: { color: "#9da59b", fontSize: 10 }, open: { color: "#818a7f", fontSize: 8, fontWeight: "900", marginTop: 7 },
  deloadTag: { alignSelf: "flex-start", color: "#15190f", backgroundColor: "#d8ff38", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, fontSize: 8, fontWeight: "900", letterSpacing: .7, marginTop: 7 },
  back: { alignSelf: "flex-start", marginTop: 22, paddingVertical: 6 }, backText: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .8 }, detailDate: { color: "#91998f", fontSize: 11, marginTop: 7 },
  detailStats: { flexDirection: "row", gap: 7, marginTop: 17 }, stat: { flex: 1, backgroundColor: "#1a1f1a", borderRadius: 8, paddingVertical: 13, paddingHorizontal: 8 }, statValue: { color: "#f0f3ed", fontSize: 13, fontWeight: "900" }, statLabel: { color: "#788176", fontSize: 8, fontWeight: "900", marginTop: 4 },
  notes: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 14, marginTop: 14 }, notesLabel: { color: "#90988e", fontSize: 9, fontWeight: "900", letterSpacing: .8 }, notesInput: { color: "#eef1eb", fontSize: 12, lineHeight: 18, minHeight: 58, textAlignVertical: "top", marginTop: 7 },
  exerciseCard: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 14, marginTop: 9 }, exerciseTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }, exerciseName: { color: "#eff2ed", fontSize: 15, fontWeight: "800" }, exerciseVolume: { color: "#899188", fontSize: 9, marginTop: 4 }, exerciseCount: { color: "#d8ff38", fontSize: 14, fontWeight: "900" },
  setRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#2b312b", minHeight: 39 }, skippedRow: { opacity: .48 }, setIndex: { color: "#8e978c", fontSize: 7, fontWeight: "900", width: "27%" }, workingSet: { color: "#d8ff38" }, setValue: { color: "#e5e9e2", fontSize: 12, fontWeight: "700", width: "40%" }, setStatus: { color: "#b9c99b", fontSize: 9, fontWeight: "800", flex: 1, textAlign: "right" }, skipped: { color: "#9b7770" }, comparison: { color: "#b9c99b", fontSize: 9, lineHeight: 14, marginTop: 10 },
  delete: { height: 45, borderRadius: 8, borderWidth: 1, borderColor: "#8b4e44", alignItems: "center", justifyContent: "center", marginTop: 24 }, deleteText: { color: "#e28b7d", fontSize: 9, fontWeight: "900", letterSpacing: .8 },
  repeat: { height: 48, borderRadius: 8, backgroundColor: "#d8ff38", alignItems: "center", justifyContent: "center", marginTop: 12 }, repeatText: { color: "#15190f", fontSize: 10, fontWeight: "900", letterSpacing: .8 },
  repeatDeload: { height: 44, borderRadius: 8, borderWidth: 1, borderColor: "#d8ff38", alignItems: "center", justifyContent: "center", marginTop: 8 }, repeatDeloadText: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .8 },
});
