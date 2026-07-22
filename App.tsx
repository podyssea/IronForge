import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { applyTrainingPhase, Exercise, generateFromStyle, initialFourDaySplit, progression, sessionVolume, SessionRecord, TrainingPhase, Workout } from "./src/domain/training";
import { loadAppState, saveAppState } from "./src/storage/appStorage";

const WORKOUT_DAYS = ["MON", "TUE", "THU", "FRI"];

export default function App() {
  const [workouts, setWorkouts] = useState<Workout[]>(initialFourDaySplit);
  const [selected, setSelected] = useState(0);
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [view, setView] = useState<"log" | "history" | "program">("log");
  const [trainingDays, setTrainingDays] = useState(4);
  const [phase, setPhase] = useState<TrainingPhase>("hypertrophy");
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    loadAppState().then((state) => {
      setWorkouts(state.workouts);
      setRecords(state.records);
      setTrainingDays(state.program.trainingDays);
      setPhase(state.program.phase);
      setLoaded(true);
    }).catch((error: unknown) => {
      console.warn("IronForge: unable to load saved data.", error);
      setStorageError("Saved data could not be loaded. Using the default program.");
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (!loaded) return;
    saveAppState({ workouts, records, program: { trainingDays, phase } })
      .then(() => setStorageError(null))
      .catch((error: unknown) => {
        console.warn("IronForge: unable to save app data.", error);
        setStorageError("Changes could not be saved. Check available device storage.");
      });
  }, [workouts, records, trainingDays, phase, loaded]);

  const workout = workouts[selected];
  const completedSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length, 0);
  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0);
  const volume = useMemo(() => sessionVolume(workout.exercises), [workout]);

  function updateSet(exerciseId: string, setIndex: number, changes: Partial<Exercise["sets"][number]>) {
    setWorkouts((current) => current.map((item, workoutIndex) => workoutIndex !== selected ? item : {
      ...item,
      exercises: item.exercises.map((exercise) => exercise.id !== exerciseId ? exercise : {
        ...exercise,
        sets: exercise.sets.map((set, index) => index === setIndex ? { ...set, ...changes } : set)
      })
    }));
  }

  function finishWorkout() {
    if (!completedSets) return Alert.alert("Log a set first", "Mark your completed sets to finish this workout.");
    const record: SessionRecord = { id: String(Date.now()), completedAt: new Date().toISOString(), workoutTitle: workout.title, exercises: workout.exercises.map((exercise) => {
      const completed = exercise.sets.filter((set) => set.completed);
      const latest = completed[completed.length - 1];
      return { ...exercise, lastWeight: latest?.weight ?? exercise.lastWeight, lastReps: latest?.reps ?? exercise.lastReps, sets: exercise.sets.map((set) => ({ ...set })) };
    }), volume };
    setRecords((current) => [record, ...current]);
    setWorkouts((current) => current.map((item, workoutIndex) => workoutIndex !== selected ? item : {
      ...item,
      exercises: item.exercises.map((exercise) => {
        const completed = exercise.sets.filter((set) => set.completed);
        const latest = completed[completed.length - 1];
        return latest ? { ...exercise, lastWeight: latest.weight, lastReps: latest.reps, sets: exercise.sets.map((set) => ({ ...set, completed: false })) } : exercise;
      })
    }));
    Alert.alert("Workout saved", `${completedSets} sets logged · ${volume.toLocaleString()} kg volume`);
    setView("history");
  }

  function applyProgram() {
    setWorkouts((current) => applyTrainingPhase(generateFromStyle(trainingDays, current), phase));
    setSelected(0);
    setView("log");
    Alert.alert("Program updated", `${trainingDays}-day ${phase} plan is ready. Your logged loads were retained.`);
  }

  return <SafeAreaView style={styles.safe}><StatusBar style="light" />
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      {storageError && <View style={styles.storageError}><Text style={styles.storageErrorText}>{storageError}</Text></View>}
      <View style={styles.viewTabs}><Pressable onPress={() => setView("log")} style={[styles.viewTab, view === "log" && styles.viewTabActive]}><Text style={[styles.viewTabText, view === "log" && styles.viewTabTextActive]}>LOG</Text></Pressable><Pressable onPress={() => setView("history")} style={[styles.viewTab, view === "history" && styles.viewTabActive]}><Text style={[styles.viewTabText, view === "history" && styles.viewTabTextActive]}>HISTORY</Text></Pressable><Pressable onPress={() => setView("program")} style={[styles.viewTab, view === "program" && styles.viewTabActive]}><Text style={[styles.viewTabText, view === "program" && styles.viewTabTextActive]}>PROGRAM</Text></Pressable></View>
      {view === "history" ? <History records={records} /> : view === "program" ? <ProgramBuilder trainingDays={trainingDays} phase={phase} onDays={setTrainingDays} onPhase={setPhase} onApply={applyProgram} /> : <>
      <View style={styles.topline}><Text style={styles.brand}>IRON<Text style={styles.accent}>FORGE</Text></Text><Text style={styles.live}>● LIVE LOG</Text></View>
      <Text style={styles.kicker}>TODAY'S TRAINING</Text><Text style={styles.title}>{workout.title.split(" · ").pop()}</Text>
      <View style={styles.dayTabs}>{WORKOUT_DAYS.map((day, index) => <Pressable key={day} onPress={() => setSelected(index)} style={[styles.day, selected === index && styles.dayActive]}><Text style={[styles.dayText, selected === index && styles.dayTextActive]}>{day}</Text></Pressable>)}</View>
      <View style={styles.summary}><View><Text style={styles.summaryNumber}>{completedSets}<Text style={styles.dim}>/{totalSets}</Text></Text><Text style={styles.summaryLabel}>SETS DONE</Text></View><View style={styles.summaryDivider}/><View><Text style={styles.summaryNumber}>{volume.toLocaleString()}</Text><Text style={styles.summaryLabel}>KG VOLUME</Text></View><View style={styles.summaryDivider}/><View><Text style={styles.focus}>{workout.focus}</Text><Text style={styles.summaryLabel}>SESSION FOCUS</Text></View></View>
      {workout.exercises.map((exercise, number) => <ExerciseCard key={exercise.id} exercise={exercise} number={number + 1} onChange={updateSet} />)}
      <Pressable style={styles.finish} onPress={finishWorkout}><Text style={styles.finishText}>FINISH WORKOUT</Text><Text style={styles.finishArrow}>→</Text></Pressable>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function ProgramBuilder({ trainingDays, phase, onDays, onPhase, onApply }: { trainingDays: number; phase: TrainingPhase; onDays: (days: number) => void; onPhase: (phase: TrainingPhase) => void; onApply: () => void }) {
  const phaseInfo: Record<TrainingPhase, string> = { strength: "Lower reps and focused working sets.", hypertrophy: "Moderate-to-high reps for muscle-building volume.", deload: "Half volume with loads reduced by 15%." };
  return <><Text style={styles.kicker}>ADAPTIVE PROGRAM</Text><Text style={styles.title}>Build your split</Text>
    <Text style={styles.builderLabel}>TRAINING DAYS</Text><View style={styles.choiceRow}>{[2, 3, 4, 5].map((days) => <Pressable key={days} onPress={() => onDays(days)} style={[styles.dayChoice, trainingDays === days && styles.dayChoiceActive]}><Text style={[styles.dayChoiceText, trainingDays === days && styles.dayChoiceTextActive]}>{days}</Text><Text style={[styles.dayChoiceCaption, trainingDays === days && styles.dayChoiceTextActive]}>DAYS</Text></Pressable>)}</View>
    <View style={styles.preview}><Text style={styles.previewTitle}>{trainingDays === 2 ? "Full body A / B" : trainingDays === 3 ? "Upper / Lower / Upper" : trainingDays === 4 ? "Upper / Lower split" : "Upper / Lower + pump"}</Text><Text style={styles.previewText}>Built automatically from your current exercise selection. Working loads carry forward.</Text></View>
    <Text style={styles.builderLabel}>CURRENT PHASE</Text>{(["strength", "hypertrophy", "deload"] as TrainingPhase[]).map((item) => <Pressable key={item} onPress={() => onPhase(item)} style={[styles.phaseChoice, phase === item && styles.phaseChoiceActive]}><View><Text style={[styles.phaseName, phase === item && styles.phaseNameActive]}>{item.toUpperCase()}</Text><Text style={styles.phaseText}>{phaseInfo[item]}</Text></View><View style={[styles.radio, phase === item && styles.radioActive]}>{phase === item && <View style={styles.radioDot} />}</View></Pressable>)}
    <Pressable style={styles.finish} onPress={onApply}><Text style={styles.finishText}>APPLY PROGRAM</Text><Text style={styles.finishArrow}>→</Text></Pressable>
  </>;
}

function History({ records }: { records: SessionRecord[] }) {
  const latestExercises = new Map<string, Exercise>();
  records.forEach((record) => record.exercises.forEach((exercise) => { if (!latestExercises.has(exercise.id)) latestExercises.set(exercise.id, exercise); }));
  return <><Text style={styles.kicker}>SESSION ARCHIVE</Text><Text style={styles.title}>History</Text>
    {records.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No workouts saved yet</Text><Text style={styles.emptyText}>Finish a workout and it will appear here with its loads, reps, and volume.</Text></View> : <>
      <View style={styles.historyStat}><Text style={styles.historyNumber}>{records.length}</Text><Text style={styles.historyLabel}>WORKOUTS COMPLETED</Text><Text style={styles.historyVolume}>{records.reduce((sum, record) => sum + record.volume, 0).toLocaleString()} kg total volume</Text></View>
      <Text style={styles.sectionLabel}>RECENT SESSIONS</Text>{records.map((record) => <View key={record.id} style={styles.historyCard}><View><Text style={styles.historyTitle}>{record.workoutTitle.split(" · ").pop()}</Text><Text style={styles.historyDate}>{new Date(record.completedAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {record.exercises.filter((exercise) => exercise.sets.some((set) => set.completed)).length} exercises</Text></View><Text style={styles.cardVolume}>{record.volume.toLocaleString()}<Text style={styles.cardUnit}> kg</Text></Text></View>)}</>}
    {latestExercises.size > 0 && <><Text style={styles.sectionLabel}>LATEST PERFORMANCE</Text>{Array.from(latestExercises.values()).map((exercise) => <View key={exercise.id} style={styles.performanceCard}><Text style={styles.performanceName}>{exercise.name}</Text><Text style={styles.performanceValue}>{exercise.lastWeight} kg × {exercise.lastReps}</Text><Text style={styles.performanceTip}>{progression(exercise)}</Text></View>)}</>}
  </>;
}

function ExerciseCard({ exercise, number, onChange }: { exercise: Exercise; number: number; onChange: (id: string, set: number, changes: Partial<Exercise["sets"][number]>) => void }) {
  const isComplete = exercise.sets.every((set) => set.completed);
  const toggleExercise = () => exercise.sets.forEach((_, index) => onChange(exercise.id, index, { completed: !isComplete }));
  return <View style={styles.card}><View style={styles.exerciseHeader}><View><Text style={styles.exerciseNumber}>EXERCISE {String(number).padStart(2, "0")}</Text><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseMeta}>{exercise.targetSets} sets · {exercise.repRange[0]}–{exercise.repRange[1]} reps</Text></View><View style={styles.previous}><Text style={styles.previousLabel}>LAST TIME</Text><Text style={styles.previousValue}>{exercise.lastWeight} <Text style={styles.unit}>kg</Text> × {exercise.lastReps}</Text></View></View>
    <View style={styles.tableHead}><Text style={[styles.head, styles.setCol]}>SET</Text><Text style={[styles.head, styles.inputCol]}>KG</Text><Text style={[styles.head, styles.inputCol]}>REPS</Text></View>
    {exercise.sets.map((set, index) => <View style={[styles.setRow, isComplete && styles.setRowDone]} key={index}><Text style={[styles.setNumber, styles.setCol]}>{index + 1}</Text><TextInput value={String(set.weight)} onChangeText={(text) => onChange(exercise.id, index, { weight: Number(text.replace(",", ".")) || 0 })} keyboardType="decimal-pad" selectTextOnFocus style={[styles.input, styles.inputCol]} /><TextInput value={String(set.reps)} onChangeText={(text) => onChange(exercise.id, index, { reps: Number(text) || 0 })} keyboardType="number-pad" selectTextOnFocus style={[styles.input, styles.inputCol]} /></View>)}
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isComplete }} onPress={toggleExercise} style={[styles.exerciseToggle, isComplete && styles.exerciseToggleDone]}><Text style={[styles.exerciseToggleText, isComplete && styles.exerciseToggleTextDone]}>{isComplete ? "✓ EXERCISE COMPLETE" : "MARK EXERCISE COMPLETE"}</Text></Pressable>
    <Text style={styles.tip}>{progression(exercise)}</Text>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#101311" }, page: { padding: 20, paddingBottom: 42 }, storageError: { backgroundColor: "#3b211d", borderColor: "#d36b5b", borderWidth: 1, borderRadius: 7, padding: 11, marginTop: 10 }, storageErrorText: { color: "#ffd6cf", fontSize: 11, lineHeight: 16, fontWeight: "700" }, topline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }, brand: { color: "#f2f4ef", fontSize: 18, fontWeight: "900", letterSpacing: 1.2 }, accent: { color: "#d8ff38" }, live: { color: "#d8ff38", fontSize: 10, fontWeight: "800", letterSpacing: 1 }, viewTabs: { flexDirection: "row", backgroundColor: "#1a1f1a", borderRadius: 8, padding: 4, marginTop: 22, gap: 4 }, viewTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 5 }, viewTabActive: { backgroundColor: "#d8ff38" }, viewTabText: { color: "#848c82", fontSize: 9, fontWeight: "900", letterSpacing: .5 }, viewTabTextActive: { color: "#15190f" }, kicker: { color: "#8d958c", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 30 }, title: { color: "#f8faf5", fontSize: 34, fontWeight: "800", marginTop: 4 }, dayTabs: { flexDirection: "row", marginTop: 23, gap: 7 }, day: { flex: 1, height: 40, borderRadius: 7, justifyContent: "center", alignItems: "center", backgroundColor: "#1a1f1a" }, dayActive: { backgroundColor: "#d8ff38" }, dayText: { color: "#80877f", fontWeight: "800", fontSize: 11 }, dayTextActive: { color: "#141710" }, summary: { backgroundColor: "#1a1f1a", borderRadius: 10, marginTop: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, summaryNumber: { color: "#f5f6f0", fontSize: 23, fontWeight: "800" }, dim: { color: "#727a70" }, summaryLabel: { color: "#7d857c", fontSize: 8, fontWeight: "800", letterSpacing: .8, marginTop: 4 }, summaryDivider: { height: 32, width: 1, backgroundColor: "#303730" }, focus: { color: "#e1e6dd", fontSize: 10, fontWeight: "700", maxWidth: 70 }, card: { backgroundColor: "#1a1f1a", borderRadius: 10, padding: 15, marginTop: 14 }, exerciseHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }, exerciseNumber: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 }, exerciseName: { color: "#f3f5f1", fontSize: 17, fontWeight: "800", marginTop: 3 }, exerciseMeta: { color: "#8b9489", fontSize: 11, marginTop: 3 }, previous: { alignItems: "flex-end" }, previousLabel: { color: "#717971", fontSize: 8, fontWeight: "800", letterSpacing: .8 }, previousValue: { color: "#ebeee8", fontSize: 12, fontWeight: "700", marginTop: 4 }, unit: { color: "#929a91" }, tableHead: { flexDirection: "row", paddingBottom: 7 }, head: { color: "#777f76", fontSize: 9, fontWeight: "800", letterSpacing: .7 }, setCol: { width: "19%" }, inputCol: { width: "40.5%" }, setRow: { flexDirection: "row", alignItems: "center", minHeight: 45, borderTopWidth: 1, borderTopColor: "#2b312b" }, setRowDone: { backgroundColor: "#202a1d" }, setNumber: { color: "#aeb5ad", fontSize: 13, fontWeight: "700", paddingLeft: 6 }, input: { color: "#f5f7f2", fontSize: 16, fontWeight: "800", height: 34, textAlign: "left" }, exerciseToggle: { height: 38, marginTop: 12, borderWidth: 1, borderColor: "#667063", borderRadius: 6, justifyContent: "center", alignItems: "center" }, exerciseToggleDone: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, exerciseToggleText: { color: "#cbd1c9", fontSize: 10, fontWeight: "900", letterSpacing: .8 }, exerciseToggleTextDone: { color: "#15200e" }, tip: { color: "#858d83", fontSize: 10, marginTop: 11, lineHeight: 14 }, finish: { height: 58, borderRadius: 9, backgroundColor: "#d8ff38", marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }, finishText: { color: "#15190f", fontWeight: "900", fontSize: 13, letterSpacing: 1 }, finishArrow: { color: "#15190f", fontSize: 22, fontWeight: "700" }, empty: { backgroundColor: "#1a1f1a", borderRadius: 10, padding: 22, marginTop: 20 }, emptyTitle: { color: "#f4f6f1", fontSize: 17, fontWeight: "800" }, emptyText: { color: "#8d958b", fontSize: 12, lineHeight: 18, marginTop: 8 }, historyStat: { backgroundColor: "#1a1f1a", borderRadius: 10, marginTop: 18, padding: 18 }, historyNumber: { color: "#d8ff38", fontSize: 34, fontWeight: "900" }, historyLabel: { color: "#7d857c", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 3 }, historyVolume: { color: "#dce1db", fontSize: 13, fontWeight: "700", marginTop: 14 }, sectionLabel: { color: "#90988e", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginTop: 26, marginBottom: 8 }, historyCard: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 15, marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, historyTitle: { color: "#eff2ed", fontSize: 15, fontWeight: "800" }, historyDate: { color: "#858d83", fontSize: 11, marginTop: 5 }, cardVolume: { color: "#d8ff38", fontSize: 17, fontWeight: "900" }, cardUnit: { color: "#9da59b", fontSize: 10 }, performanceCard: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 15, marginTop: 8 }, performanceName: { color: "#f0f3ef", fontSize: 15, fontWeight: "800" }, performanceValue: { color: "#d8ff38", fontSize: 13, fontWeight: "800", marginTop: 5 }, performanceTip: { color: "#858d83", fontSize: 10, lineHeight: 14, marginTop: 8 }, builderLabel: { color: "#929a90", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginTop: 27, marginBottom: 10 }, choiceRow: { flexDirection: "row", gap: 8 }, dayChoice: { flex: 1, backgroundColor: "#1a1f1a", borderRadius: 8, paddingVertical: 14, alignItems: "center" }, dayChoiceActive: { backgroundColor: "#d8ff38" }, dayChoiceText: { color: "#e8ece6", fontSize: 22, fontWeight: "900" }, dayChoiceTextActive: { color: "#15200e" }, dayChoiceCaption: { color: "#899188", fontSize: 8, fontWeight: "900", letterSpacing: .8, marginTop: 2 }, preview: { backgroundColor: "#1a1f1a", borderLeftWidth: 3, borderLeftColor: "#d8ff38", borderRadius: 7, padding: 14, marginTop: 15 }, previewTitle: { color: "#f3f5f0", fontSize: 15, fontWeight: "800" }, previewText: { color: "#8c958a", fontSize: 11, lineHeight: 16, marginTop: 5 }, phaseChoice: { backgroundColor: "#1a1f1a", borderWidth: 1, borderColor: "#1a1f1a", borderRadius: 9, padding: 15, marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, phaseChoiceActive: { borderColor: "#d8ff38" }, phaseName: { color: "#eff2ed", fontSize: 13, fontWeight: "900", letterSpacing: .8 }, phaseNameActive: { color: "#d8ff38" }, phaseText: { color: "#899188", fontSize: 11, marginTop: 5 }, radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: "#71806d", justifyContent: "center", alignItems: "center" }, radioActive: { borderColor: "#d8ff38" }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#d8ff38" }
});
