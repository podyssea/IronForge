import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ExerciseCard } from "../components/ExerciseCard";
import { CoachPanel } from "../components/CoachPanel";
import { CoachingRecommendation } from "../domain/coaching";
import { ActiveSession, sessionVolume, setValidationError, SetLog, Workout } from "../domain/training";

type WorkoutScreenProps = {
  workouts: Workout[];
  selectedWorkoutIndex: number;
  displayedWorkout: Workout;
  activeSession: ActiveSession | null;
  onSelect: (index: number) => void;
  onBegin: () => void;
  onSetChange: (id: string, set: number, changes: Partial<SetLog>) => void;
  onFinish: () => void;
  onCancel: () => void;
  onReplaceExercise: (id: string) => void;
  onNotesChange: (notes: string) => void;
  recommendations: CoachingRecommendation[];
  onApplyRecommendation: (recommendation: CoachingRecommendation, weight: number) => void;
  onRejectRecommendation: (recommendation: CoachingRecommendation) => void;
};

export function WorkoutScreen({ workouts, selectedWorkoutIndex, displayedWorkout, activeSession, onSelect, onBegin, onSetChange, onFinish, onCancel, onReplaceExercise, onNotesChange, recommendations, onApplyRecommendation, onRejectRecommendation }: WorkoutScreenProps) {
  const completedSets = displayedWorkout.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed && !setValidationError(set)).length, 0);
  const totalSets = displayedWorkout.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0);
  const volume = sessionVolume(displayedWorkout.exercises);

  return <>
    <View style={styles.topline}><Text style={styles.brand}>IRON<Text style={styles.accent}>FORGE</Text></Text><Text style={styles.live}>● {activeSession ? "SESSION ACTIVE" : "READY"}</Text></View>
    <Text style={styles.kicker}>{activeSession ? "WORKOUT IN PROGRESS" : "TODAY'S TRAINING"}</Text><Text style={styles.title}>{displayedWorkout.title.split(" · ").pop()}</Text>
    <View style={styles.dayTabs}>{workouts.map((item, index) => <Pressable key={item.id} disabled={Boolean(activeSession)} accessibilityRole="tab" accessibilityState={{ selected: selectedWorkoutIndex === index, disabled: Boolean(activeSession) }} accessibilityLabel={`Day ${index + 1}: ${item.title.split(" · ").pop()}`} onPress={() => onSelect(index)} style={[styles.day, selectedWorkoutIndex === index && styles.dayActive, activeSession && selectedWorkoutIndex !== index && styles.dayDisabled]}><Text style={[styles.dayText, selectedWorkoutIndex === index && styles.dayTextActive]}>DAY {index + 1}</Text></Pressable>)}</View>
    {activeSession && <View style={styles.activeBanner}><Text style={styles.activeBannerTitle}>SESSION SAVED AUTOMATICALLY</Text><Text style={styles.activeBannerText}>Started {new Date(activeSession.startedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · Resume anytime from the Log tab.</Text></View>}
    {activeSession && <View style={styles.notes}><Text style={styles.notesLabel}>SESSION NOTES</Text><TextInput value={activeSession.notes} onChangeText={onNotesChange} placeholder="How did the session feel?" placeholderTextColor="#687067" multiline style={styles.notesInput} /></View>}
    {!activeSession && <CoachPanel recommendations={recommendations} onApply={onApplyRecommendation} onReject={onRejectRecommendation} />}
    <View style={styles.summary}><View><Text style={styles.summaryNumber}>{completedSets}<Text style={styles.dim}>/{totalSets}</Text></Text><Text style={styles.summaryLabel}>SETS DONE</Text></View><View style={styles.summaryDivider}/><View><Text style={styles.summaryNumber}>{volume.toLocaleString()}</Text><Text style={styles.summaryLabel}>KG VOLUME</Text></View><View style={styles.summaryDivider}/><View><Text style={styles.focus}>{displayedWorkout.focus}</Text><Text style={styles.summaryLabel}>SESSION FOCUS</Text></View></View>
    {!activeSession && <Pressable style={styles.finish} onPress={onBegin}><Text style={styles.finishText}>START WORKOUT</Text><Text style={styles.finishArrow}>→</Text></Pressable>}
    {displayedWorkout.exercises.map((exercise, number) => <ExerciseCard key={exercise.id} exercise={exercise} number={number + 1} editable={Boolean(activeSession)} onChange={onSetChange} onReplace={activeSession ? undefined : onReplaceExercise} />)}
    {activeSession && <><Pressable style={styles.finish} onPress={onFinish}><Text style={styles.finishText}>FINISH WORKOUT</Text><Text style={styles.finishArrow}>→</Text></Pressable><Pressable style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>CANCEL WORKOUT</Text></Pressable></>}
  </>;
}

const styles = StyleSheet.create({
  topline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }, brand: { color: "#f2f4ef", fontSize: 18, fontWeight: "900", letterSpacing: 1.2 }, accent: { color: "#d8ff38" }, live: { color: "#d8ff38", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  kicker: { color: "#8d958c", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 30 }, title: { color: "#f8faf5", fontSize: 34, fontWeight: "800", marginTop: 4 },
  dayTabs: { flexDirection: "row", marginTop: 23, gap: 7 }, day: { flex: 1, height: 40, borderRadius: 7, justifyContent: "center", alignItems: "center", backgroundColor: "#1a1f1a" }, dayActive: { backgroundColor: "#d8ff38" }, dayDisabled: { opacity: .4 }, dayText: { color: "#80877f", fontWeight: "800", fontSize: 11 }, dayTextActive: { color: "#141710" },
  activeBanner: { backgroundColor: "#202a1d", borderColor: "#586d35", borderWidth: 1, borderRadius: 8, marginTop: 14, padding: 12 }, activeBannerTitle: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .8 }, activeBannerText: { color: "#aab3a7", fontSize: 11, lineHeight: 16, marginTop: 4 },
  notes: { backgroundColor: "#1a1f1a", borderRadius: 8, padding: 12, marginTop: 10 }, notesLabel: { color: "#90988e", fontSize: 9, fontWeight: "900", letterSpacing: .8 }, notesInput: { color: "#eef1eb", fontSize: 12, lineHeight: 18, minHeight: 54, textAlignVertical: "top", marginTop: 7 },
  summary: { backgroundColor: "#1a1f1a", borderRadius: 10, marginTop: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, summaryNumber: { color: "#f5f6f0", fontSize: 23, fontWeight: "800" }, dim: { color: "#727a70" }, summaryLabel: { color: "#7d857c", fontSize: 8, fontWeight: "800", letterSpacing: .8, marginTop: 4 }, summaryDivider: { height: 32, width: 1, backgroundColor: "#303730" }, focus: { color: "#e1e6dd", fontSize: 10, fontWeight: "700", maxWidth: 70 },
  finish: { height: 58, borderRadius: 9, backgroundColor: "#d8ff38", marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }, finishText: { color: "#15190f", fontWeight: "900", fontSize: 13, letterSpacing: 1 }, finishArrow: { color: "#15190f", fontSize: 22, fontWeight: "700" },
  cancel: { height: 46, borderRadius: 8, borderColor: "#6e7770", borderWidth: 1, marginTop: 10, alignItems: "center", justifyContent: "center" }, cancelText: { color: "#aeb5ad", fontSize: 10, fontWeight: "900", letterSpacing: .8 },
});
