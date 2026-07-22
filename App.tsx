import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActiveSession, applySessionPerformance, applyTrainingPhase, completeActiveSession, generateFromStyle, initialFourDaySplit, isSessionComplete, SessionRecord, setValidationError, SetLog, startActiveSession, TrainingPhase, Workout } from "./src/domain/training";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { ProgramScreen } from "./src/screens/ProgramScreen";
import { WorkoutScreen } from "./src/screens/WorkoutScreen";
import { loadAppState, saveAppState } from "./src/storage/appStorage";
import { CoachingProfile, DEFAULT_COACHING_PROFILE } from "./src/domain/coaching";

type AppView = "log" | "history" | "program";

export default function App() {
  const [workouts, setWorkouts] = useState<Workout[]>(initialFourDaySplit);
  const [selected, setSelected] = useState(0);
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [view, setView] = useState<AppView>("log");
  const [trainingDays, setTrainingDays] = useState(4);
  const [phase, setPhase] = useState<TrainingPhase>("hypertrophy");
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [coachingProfile, setCoachingProfile] = useState<CoachingProfile>(DEFAULT_COACHING_PROFILE);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    loadAppState().then((state) => {
      setWorkouts(state.workouts);
      setRecords(state.records);
      setTrainingDays(state.program.trainingDays);
      setPhase(state.program.phase);
      setActiveSession(state.activeSession);
      setCoachingProfile(state.coachingProfile);
      if (state.activeSession) {
        const workoutIndex = state.workouts.findIndex((item) => item.id === state.activeSession?.workoutId);
        if (workoutIndex >= 0) setSelected(workoutIndex);
      }
      setLoaded(true);
    }).catch((error: unknown) => {
      console.warn("IronForge: unable to load saved data.", error);
      setStorageError("Saved data could not be loaded. Using the default program.");
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveAppState({ workouts, records, program: { trainingDays, phase }, activeSession, coachingProfile })
      .then(() => setStorageError(null))
      .catch((error: unknown) => {
        console.warn("IronForge: unable to save app data.", error);
        setStorageError("Changes could not be saved. Check available device storage.");
      });
  }, [workouts, records, trainingDays, phase, activeSession, coachingProfile, loaded]);

  const selectedWorkoutIndex = selected < workouts.length ? selected : 0;
  const workout = workouts[selectedWorkoutIndex];
  const displayedWorkout: Workout = activeSession ? { id: activeSession.workoutId, title: activeSession.workoutTitle, focus: activeSession.focus, exercises: activeSession.exercises } : workout;
  const completedSets = displayedWorkout.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed && !setValidationError(set)).length, 0);
  const totalSets = displayedWorkout.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0);

  function updateSet(exerciseId: string, setIndex: number, changes: Partial<SetLog>) {
    setActiveSession((current) => current ? {
      ...current,
      exercises: current.exercises.map((exercise) => exercise.id !== exerciseId ? exercise : {
        ...exercise,
        sets: exercise.sets.map((set, index) => index === setIndex ? { ...set, ...changes } : set),
      }),
    } : current);
  }

  function cancelWorkout() {
    Alert.alert("Cancel workout?", "Your changes from this active session will be discarded.", [
      { text: "Keep training", style: "cancel" },
      { text: "Cancel workout", style: "destructive", onPress: () => setActiveSession(null) },
    ]);
  }

  function finishWorkout() {
    if (!activeSession) return;
    if (!completedSets) return Alert.alert("Log a set first", "Mark your completed sets to finish this workout.");
    if (!isSessionComplete(activeSession.exercises)) {
      return Alert.alert("Finish partial workout?", `${completedSets} of ${totalSets} sets are complete. Incomplete sets will not count toward your volume or latest performance.`, [
        { text: "Keep training", style: "cancel" },
        { text: "Finish anyway", onPress: saveFinishedWorkout },
      ]);
    }
    saveFinishedWorkout();
  }

  function saveFinishedWorkout() {
    if (!activeSession) return;
    const record = completeActiveSession(activeSession);
    setRecords((current) => [record, ...current]);
    setWorkouts((current) => applySessionPerformance(current, activeSession));
    setActiveSession(null);
    Alert.alert("Workout saved", `${completedSets} sets logged · ${record.volume.toLocaleString()} kg volume`);
    setView("history");
  }

  function applyProgram() {
    if (activeSession) {
      setView("log");
      return Alert.alert("Workout in progress", "Finish or cancel your active workout before changing the program.");
    }
    setWorkouts((current) => applyTrainingPhase(generateFromStyle(trainingDays, current), phase));
    setSelected(0);
    setView("log");
    Alert.alert("Program updated", `${trainingDays}-day ${phase} plan is ready. Your logged loads were retained.`);
  }

  return <SafeAreaView style={styles.safe}><StatusBar style="light" />
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      {storageError && <View style={styles.storageError}><Text style={styles.storageErrorText}>{storageError}</Text></View>}
      <View style={styles.viewTabs}>{(["log", "history", "program"] as AppView[]).map((item) => <Pressable key={item} onPress={() => setView(item)} style={[styles.viewTab, view === item && styles.viewTabActive]}><Text style={[styles.viewTabText, view === item && styles.viewTabTextActive]}>{item.toUpperCase()}</Text></Pressable>)}</View>
      {view === "history" ? <HistoryScreen records={records} /> : view === "program" ? <ProgramScreen trainingDays={trainingDays} phase={phase} onDays={setTrainingDays} onPhase={setPhase} onApply={applyProgram} /> : <WorkoutScreen workouts={workouts} selectedWorkoutIndex={selectedWorkoutIndex} displayedWorkout={displayedWorkout} activeSession={activeSession} onSelect={setSelected} onBegin={() => setActiveSession(startActiveSession(workout))} onSetChange={updateSet} onFinish={finishWorkout} onCancel={cancelWorkout} />}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#101311" }, page: { padding: 20, paddingBottom: 42 },
  storageError: { backgroundColor: "#3b211d", borderColor: "#d36b5b", borderWidth: 1, borderRadius: 7, padding: 11, marginTop: 10 }, storageErrorText: { color: "#ffd6cf", fontSize: 11, lineHeight: 16, fontWeight: "700" },
  viewTabs: { flexDirection: "row", backgroundColor: "#1a1f1a", borderRadius: 8, padding: 4, marginTop: 22, gap: 4 }, viewTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 5 }, viewTabActive: { backgroundColor: "#d8ff38" }, viewTabText: { color: "#848c82", fontSize: 9, fontWeight: "900", letterSpacing: .5 }, viewTabTextActive: { color: "#15190f" },
});
