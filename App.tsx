import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActiveSession, applySessionPerformance, completeActiveSession, initialFourDaySplit, isSessionComplete, LoadingType, replaceWorkoutExercise, SessionRecord, setValidationError, SetLog, startActiveSession, TrainingPhase, Workout } from "./src/domain/training";
import { ExerciseDefinition } from "./src/domain/exerciseLibrary";
import { generateAdaptiveProgram } from "./src/domain/programGenerator";
import { deleteSessionRecord } from "./src/domain/sessionJournal";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { ProgramScreen } from "./src/screens/ProgramScreen";
import { WorkoutScreen } from "./src/screens/WorkoutScreen";
import { ExerciseLibraryScreen } from "./src/screens/ExerciseLibraryScreen";
import { AnalyticsScreen } from "./src/screens/AnalyticsScreen";
import { loadAppState, saveAppState } from "./src/storage/appStorage";
import { applyCoachingRecommendation, buildWorkoutRecommendations, CoachingDecision, CoachingProfile, CoachingRecommendation, DEFAULT_COACHING_PROFILE } from "./src/domain/coaching";

type AppView = "log" | "history" | "analytics" | "program" | "library";

export default function App() {
  const [workouts, setWorkouts] = useState<Workout[]>(initialFourDaySplit);
  const [selected, setSelected] = useState(0);
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [view, setView] = useState<AppView>("log");
  const [trainingDays, setTrainingDays] = useState(4);
  const [phase, setPhase] = useState<TrainingPhase>("hypertrophy");
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [coachingProfile, setCoachingProfile] = useState<CoachingProfile>(DEFAULT_COACHING_PROFILE);
  const [coachingDecisions, setCoachingDecisions] = useState<CoachingDecision[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [replacementExerciseId, setReplacementExerciseId] = useState<string | null>(null);

  useEffect(() => {
    loadAppState().then((state) => {
      setWorkouts(state.workouts);
      setRecords(state.records);
      setTrainingDays(state.program.trainingDays);
      setPhase(state.program.phase);
      setActiveSession(state.activeSession);
      setCoachingProfile(state.coachingProfile);
      setCoachingDecisions(state.coachingDecisions);
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
    saveAppState({ workouts, records, program: { trainingDays, phase }, activeSession, coachingProfile, coachingDecisions })
      .then(() => setStorageError(null))
      .catch((error: unknown) => {
        console.warn("IronForge: unable to save app data.", error);
        setStorageError("Changes could not be saved. Check available device storage.");
      });
  }, [workouts, records, trainingDays, phase, activeSession, coachingProfile, coachingDecisions, loaded]);

  const selectedWorkoutIndex = selected < workouts.length ? selected : 0;
  const workout = workouts[selectedWorkoutIndex];
  const displayedWorkout: Workout = activeSession ? { id: activeSession.workoutId, title: activeSession.workoutTitle, focus: activeSession.focus, exercises: activeSession.exercises } : workout;
  const completedSets = displayedWorkout.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed && !setValidationError(set)).length, 0);
  const totalSets = displayedWorkout.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0);
  const recommendations = useMemo(() => activeSession ? [] : buildWorkoutRecommendations(workout, records, coachingDecisions), [activeSession, workout, records, coachingDecisions]);

  function updateSet(exerciseId: string, setIndex: number, changes: Partial<SetLog>) {
    setActiveSession((current) => current ? {
      ...current,
      exercises: current.exercises.map((exercise) => exercise.id !== exerciseId ? exercise : {
        ...exercise,
        sets: exercise.sets.map((set, index) => index === setIndex ? { ...set, ...changes } : set),
      }),
    } : current);
  }

  function setLoadingType(exerciseId: string, loadingType: LoadingType) {
    setWorkouts((current) => current.map((item) => item.id !== workout.id ? item : {
      ...item,
      exercises: item.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, loadingType } : exercise),
    }));
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
    setWorkouts((current) => generateAdaptiveProgram(trainingDays, coachingProfile, current));
    setPhase(coachingProfile.goal === "strength" ? "strength" : "hypertrophy");
    setSelected(0);
    setView("log");
    Alert.alert("Program generated", `Your ${trainingDays}-day ${coachingProfile.goal.replaceAll("-", " ")} plan is ready. It uses your equipment, experience, and ${coachingProfile.sessionMinutes}-minute session target.`);
  }

  function openReplacement(exerciseId: string) {
    setReplacementExerciseId(exerciseId);
    setView("library");
  }

  function chooseReplacement(replacement: ExerciseDefinition) {
    if (!replacementExerciseId) return;
    const replaced = displayedWorkout.exercises.find((exercise) => exercise.id === replacementExerciseId);
    setWorkouts((current) => replaceWorkoutExercise(current, workout.id, replacementExerciseId, replacement));
    setReplacementExerciseId(null);
    setView("log");
    Alert.alert("Exercise replaced", `${replaced?.name ?? "Exercise"} was replaced with ${replacement.name}. Your set and rep prescription was retained.`);
  }

  function setExercisePreference(exerciseId: string, preference: "preferred" | "excluded" | "neutral") {
    setCoachingProfile((current) => ({
      ...current,
      preferredExerciseIds: preference === "preferred" ? [...current.preferredExerciseIds.filter((id) => id !== exerciseId), exerciseId] : current.preferredExerciseIds.filter((id) => id !== exerciseId),
      excludedExerciseIds: preference === "excluded" ? [...current.excludedExerciseIds.filter((id) => id !== exerciseId), exerciseId] : current.excludedExerciseIds.filter((id) => id !== exerciseId),
    }));
  }

  function updateRecordNotes(recordId: string, notes: string) {
    setRecords((current) => current.map((record) => record.id === recordId ? { ...record, notes } : record));
  }

  function decideRecommendation(recommendation: CoachingRecommendation, selectedWeight: number, rejected = false) {
    const outcome: CoachingDecision["outcome"] = rejected ? "rejected" : selectedWeight === recommendation.suggestedWeight ? "accepted" : "modified";
    if (!rejected) setWorkouts((current) => applyCoachingRecommendation(current, recommendation, selectedWeight));
    setCoachingDecisions((current) => [{ recommendationId: recommendation.id, decidedAt: new Date().toISOString(), outcome, selectedWeight }, ...current]);
  }

  return <SafeAreaView style={styles.safe}><StatusBar style="light" />
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      {storageError && <View style={styles.storageError}><Text style={styles.storageErrorText}>{storageError}</Text></View>}
      <View style={styles.viewTabs}>{(["log", "history", "analytics", "program", "library"] as AppView[]).map((item) => <Pressable key={item} onPress={() => { setReplacementExerciseId(null); setView(item); }} style={[styles.viewTab, view === item && styles.viewTabActive]}><Text style={[styles.viewTabText, view === item && styles.viewTabTextActive]}>{item === "analytics" ? "STATS" : item.toUpperCase()}</Text></Pressable>)}</View>
      {view === "history" ? <HistoryScreen records={records} onUpdateNotes={updateRecordNotes} onDelete={(recordId) => setRecords((current) => deleteSessionRecord(current, recordId))} /> : view === "analytics" ? <AnalyticsScreen records={records} trainingDays={trainingDays} /> : view === "program" ? <ProgramScreen trainingDays={trainingDays} profile={coachingProfile} onDays={setTrainingDays} onProfile={setCoachingProfile} onApply={applyProgram} /> : view === "library" ? <ExerciseLibraryScreen replacementForId={replacementExerciseId ?? undefined} excludedIds={replacementExerciseId ? displayedWorkout.exercises.filter((exercise) => exercise.id !== replacementExerciseId).map((exercise) => exercise.id) : []} preferredIds={coachingProfile.preferredExerciseIds} profileExcludedIds={coachingProfile.excludedExerciseIds} onPreference={setExercisePreference} onSelect={replacementExerciseId ? chooseReplacement : undefined} onCancelReplacement={() => { setReplacementExerciseId(null); setView("log"); }} /> : <WorkoutScreen workouts={workouts} selectedWorkoutIndex={selectedWorkoutIndex} displayedWorkout={displayedWorkout} activeSession={activeSession} onSelect={setSelected} onBegin={() => setActiveSession(startActiveSession(workout))} onSetChange={updateSet} onFinish={finishWorkout} onCancel={cancelWorkout} onReplaceExercise={openReplacement} onLoadingType={setLoadingType} onNotesChange={(notes) => setActiveSession((current) => current ? { ...current, notes } : current)} recommendations={recommendations} onApplyRecommendation={(recommendation, weight) => decideRecommendation(recommendation, weight)} onRejectRecommendation={(recommendation) => decideRecommendation(recommendation, recommendation.currentWeight, true)} />}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#101311" }, page: { padding: 20, paddingBottom: 42 },
  storageError: { backgroundColor: "#3b211d", borderColor: "#d36b5b", borderWidth: 1, borderRadius: 7, padding: 11, marginTop: 10 }, storageErrorText: { color: "#ffd6cf", fontSize: 11, lineHeight: 16, fontWeight: "700" },
  viewTabs: { flexDirection: "row", backgroundColor: "#1a1f1a", borderRadius: 8, padding: 4, marginTop: 22, gap: 4 }, viewTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 5 }, viewTabActive: { backgroundColor: "#d8ff38" }, viewTabText: { color: "#848c82", fontSize: 9, fontWeight: "900", letterSpacing: .5 }, viewTabTextActive: { color: "#15190f" },
});
