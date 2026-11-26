import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, LayoutChangeEvent, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActiveSession, addWorkoutExercise, applySessionPerformance, applyWarmupLoads, canonicalExerciseName, completeActiveSession, completeExerciseSummary, displayWeight, editWorkoutRoutine, initialFourDaySplit, isExerciseSummarySessionComplete, isSessionComplete, LoadingType, moveWorkoutExercise, removeWorkoutExercise, reopenExerciseSummary, repeatExerciseSummarySession, replaceWorkoutExercise, resizeActiveExerciseSets, RoutineEdit, SessionRecord, setValidationError, SetLog, startDeloadExerciseSummarySession, startExerciseSummarySession, TrainingPhase, updateExercisePrescription, updateExerciseSet, updateExerciseSummary, weightUnitLabel, Workout } from "./src/domain/training";
import { ExerciseDefinition } from "./src/domain/exerciseLibrary";
import { generateAdaptiveProgram, isRoutineChangeDue, recommendedTrainingSplit, rotateIsolationExercises, routineChangeDate, routineWeek, TrainingSplit } from "./src/domain/programGenerator";
import { deleteSessionRecord, renameSessionExercise } from "./src/domain/sessionJournal";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { ProgramScreen } from "./src/screens/ProgramScreen";
import { WorkoutScreen } from "./src/screens/WorkoutScreen";
import { AppState, loadAppState, saveAppState } from "./src/storage/appStorage";
import { AppSettings, DEFAULT_APP_SETTINGS, PreviousRoutine } from "./src/storage/migrations";
import { applyCoachingRecommendation, buildWorkoutRecommendations, CoachingDecision, CoachingProfile, CoachingRecommendation, DEFAULT_COACHING_PROFILE, fixedTrainingProfile } from "./src/domain/coaching";
import { completeExpiredTemporaryPlans, createTemporaryPlan, isTemporaryPlanCurrent, TemporaryTrainingPlan, updateTemporaryPlanDraftWorkout, validateTemporaryPlanDates } from "./src/domain/temporaryPlan";
import { CoachPanel } from "./src/components/CoachPanel";
import type { RoutineScroll } from "./src/components/RoutineExerciseList";
import { WorkoutEditor } from "./src/components/WorkoutEditor";
import { finalizeWorkoutBackfill, insertSessionRecord, SaveBackfillResult, sortSessionRecords, WorkoutBackfillDraft } from "./src/domain/workoutBackfill";

type AppView = "log" | "history" | "program";

export default function App() {
  const [workouts, setWorkouts] = useState<Workout[]>(initialFourDaySplit);
  const [selected, setSelected] = useState(0);
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [view, setView] = useState<AppView>("log");
  const [trainingDays, setTrainingDays] = useState(4);
  const [phase, setPhase] = useState<TrainingPhase>("hypertrophy");
  const [routineStartedAt, setRoutineStartedAt] = useState(() => new Date().toISOString());
  const [routineChangeDeferred, setRoutineChangeDeferred] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [coachingProfile, setCoachingProfile] = useState<CoachingProfile>(DEFAULT_COACHING_PROFILE);
  const [coachingDecisions, setCoachingDecisions] = useState<CoachingDecision[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [replacementExerciseId, setReplacementExerciseId] = useState<string | null>(null);
  const [addingExercise, setAddingExercise] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [deloadWorkoutIds, setDeloadWorkoutIds] = useState<Set<string>>(() => new Set());
  const [temporaryPlans, setTemporaryPlans] = useState<TemporaryTrainingPlan[]>([]);
  const [previousRoutine, setPreviousRoutine] = useState<PreviousRoutine | null>(null);
  const [editingTemporaryPlanId, setEditingTemporaryPlanId] = useState<string | null>(null);
  const [backfillNavigation, setBackfillNavigation] = useState({ active: false, dirty: false });
  const routinePromptShown = useRef(false);
  const workoutScroll = useRef<ScrollView>(null);
  const workoutScrollOffset = useRef(0);
  const [workoutScrollEnabled, setWorkoutScrollEnabled] = useState(true);
  const routineScroll: RoutineScroll = {
    offset: () => workoutScrollOffset.current,
    scrollTo: (y) => workoutScroll.current?.scrollTo({ y, animated: false }),
    setEnabled: setWorkoutScrollEnabled,
    measure: (callback) => workoutScroll.current?.getNativeScrollRef()?.measure((_x, _y, _width, height, _pageX, pageY) => callback(pageY, height)),
  };
  const exerciseOffsets = useRef<Record<string, number>>({});
  const pendingFocusedExerciseId = useRef<string | null>(null);
  const recordsRef = useRef<SessionRecord[]>([]);
  const persistenceQueue = useRef<Promise<void>>(Promise.resolve());

  function enqueueAppStateSave(state: AppState): Promise<void> {
    const next = persistenceQueue.current.catch(() => undefined).then(() => saveAppState(state));
    persistenceQueue.current = next;
    return next;
  }

  useEffect(() => {
    loadAppState().then((state) => {
      setWorkouts(state.workouts);
      setTemporaryPlans(completeExpiredTemporaryPlans(state.temporaryPlans));
      setPreviousRoutine(state.previousRoutine);
      const sortedRecords = sortSessionRecords(state.records);
      recordsRef.current = sortedRecords;
      setRecords(sortedRecords);
      setTrainingDays(state.program.trainingDays);
      setPhase(state.program.phase);
      setRoutineStartedAt(state.program.routineStartedAt);
      setRoutineChangeDeferred(state.program.routineChangeDeferred);
      setActiveSession(state.activeSession);
      setCoachingProfile(fixedTrainingProfile(state.coachingProfile));
      setCoachingDecisions(state.coachingDecisions);
      setSettings({ ...DEFAULT_APP_SETTINGS });
      if (state.activeSession) {
        const workoutIndex = state.workouts.findIndex((item) => item.id === state.activeSession?.workoutId);
        if (workoutIndex >= 0) setSelected(workoutIndex);
      }
      setLoaded(true);
    }).catch((error: unknown) => {
      console.warn("GymJournal: unable to load saved data.", error);
      setStorageError("Saved data could not be loaded. Using the default program.");
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded || activeSession || routineChangeDeferred || routinePromptShown.current || !isRoutineChangeDue(routineStartedAt)) return;
    routinePromptShown.current = true;
    Alert.alert(
      "Six-week routine complete",
      "You have completed a full training block. Keep your compound movements and rotate the isolation exercises to introduce a fresh stimulus?",
      [
        { text: "Keep current", style: "cancel", onPress: () => setRoutineChangeDeferred(true) },
        { text: "Restructure", onPress: rotateRoutine },
      ],
    );
  }, [activeSession, loaded, routineChangeDeferred, routineStartedAt]);

  useEffect(() => {
    if (!loaded) return;
    enqueueAppStateSave({ workouts, records, program: { trainingDays, phase, routineStartedAt, routineChangeDeferred }, activeSession, coachingProfile, coachingDecisions, settings, temporaryPlans, previousRoutine })
      .then(() => setStorageError(null))
      .catch((error: unknown) => {
        console.warn("GymJournal: unable to save app data.", error);
        setStorageError("Changes could not be saved. Check available device storage.");
      });
  }, [workouts, records, trainingDays, phase, routineStartedAt, routineChangeDeferred, activeSession, coachingProfile, coachingDecisions, settings, temporaryPlans, previousRoutine, loaded]);

  useEffect(() => { recordsRef.current = records; }, [records]);

  const activeTemporaryPlan = temporaryPlans.find((plan) => isTemporaryPlanCurrent(plan));
  const sessionTemporaryPlan = activeSession ? temporaryPlans.find((plan) => plan.workouts.some((item) => item.id === activeSession.workoutId)) : undefined;
  const editedTemporaryPlan = temporaryPlans.find((plan) => plan.id === editingTemporaryPlanId);
  const visibleTemporaryPlan = editedTemporaryPlan ?? activeTemporaryPlan ?? sessionTemporaryPlan;
  const visibleWorkouts = visibleTemporaryPlan?.workouts ?? workouts;
  const backfillWorkouts = activeTemporaryPlan?.workouts ?? workouts;
  const selectedWorkoutIndex = selected < visibleWorkouts.length ? selected : 0;
  const workout = visibleWorkouts[selectedWorkoutIndex];
  const displayedWorkout: Workout = activeSession ? { id: activeSession.workoutId, title: activeSession.workoutTitle, focus: activeSession.focus, estimatedDurationMinutes: activeSession.estimatedDurationMinutes, strengthPriority: activeSession.strengthPriority, exercises: activeSession.exercises } : workout;
  const summaryMode = activeSession?.exerciseLogFormat === "exercise-summary-v1";
  const completedSets = displayedWorkout.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set, index) => set.completed && (summaryMode || !setValidationError(set, exercise, index))).length, 0);
  const totalSets = displayedWorkout.exercises.reduce((sum, exercise) => sum + (summaryMode ? exercise.sets.length : exercise.targetSets), 0);
  const recommendations = useMemo(() => activeSession ? [] : buildWorkoutRecommendations(workout, records, coachingDecisions), [activeSession, workout, records, coachingDecisions]);

  function updateVisibleWorkouts(update: (current: Workout[]) => Workout[]) {
    if (visibleTemporaryPlan) {
      setTemporaryPlans((current) => current.map((plan) => plan.id === visibleTemporaryPlan.id ? { ...plan, workouts: update(plan.workouts) } : plan));
    } else {
      setWorkouts(update);
    }
  }

  useEffect(() => {
    if (!loaded || activeSession) return;
    setTemporaryPlans((current) => {
      const next = completeExpiredTemporaryPlans(current);
      return next.some((plan, index) => plan.status !== current[index]?.status) ? next : current;
    });
  }, [activeSession, loaded]);

  function updateSet(exerciseId: string, setIndex: number, changes: Partial<SetLog>) {
    setActiveSession((current) => current ? {
      ...current,
      exercises: current.exercises.map((exercise) => exercise.id !== exerciseId ? exercise : updateExerciseSet(exercise, setIndex, changes)),
    } : current);
  }

  function setLoadingType(exerciseId: string, loadingType: LoadingType) {
    updateVisibleWorkouts((current) => current.map((item) => ({
      ...item,
      exercises: item.exercises.map((exercise) => exercise.id === exerciseId && !exercise.loadingType ? { ...exercise, loadingType } : exercise),
    })));
    setActiveSession((current) => !current ? current : {
      ...current,
      exercises: current.exercises.map((exercise) => exercise.id === exerciseId && !exercise.loadingType ? { ...exercise, loadingType } : exercise),
    });
  }

  function setThreeByThreeWorkingLoad(exerciseId: string, weight: number) {
    if (activeSession) {
      setActiveSession((current) => !current ? current : {
        ...current,
        exercises: current.exercises.map((exercise) => {
          if (exercise.id !== exerciseId) return exercise;
          return applyWarmupLoads({ ...exercise, lastWeight: weight, lastReps: 3 }, weight);
        }),
      });
      return;
    }
    updateVisibleWorkouts((current) => current.map((item) => item.id !== workout.id ? item : {
      ...item,
      exercises: item.exercises.map((exercise) => exercise.id !== exerciseId ? exercise : applyWarmupLoads({ ...exercise, lastWeight: weight, lastReps: 3 }, weight)),
    }));
  }

  function scrollToExercise(exerciseId: string, animated: boolean) {
    const offset = exerciseOffsets.current[exerciseId];
    if (offset === undefined) return;
    requestAnimationFrame(() => workoutScroll.current?.scrollTo({ y: Math.max(0, offset - 12), animated }));
  }

  function focusExercise(exerciseId: string | null) {
    pendingFocusedExerciseId.current = exerciseId;
    setActiveSession((current) => current ? { ...current, focusedExerciseId: exerciseId ?? undefined } : current);
    if (exerciseId) scrollToExercise(exerciseId, true);
  }

  function registerExerciseLayout(exerciseId: string, event: LayoutChangeEvent) {
    exerciseOffsets.current[exerciseId] = event.nativeEvent.layout.y;
    if (activeSession?.focusedExerciseId === exerciseId || pendingFocusedExerciseId.current === exerciseId) {
      scrollToExercise(exerciseId, false);
      if (pendingFocusedExerciseId.current === exerciseId) pendingFocusedExerciseId.current = null;
    }
  }

  function addExerciseSet(exerciseId: string) {
    if (activeSession) {
      setActiveSession((current) => !current ? current : {
        ...current,
        exercises: current.exercises.map((exercise) => exercise.id === exerciseId ? resizeActiveExerciseSets(exercise, exercise.targetSets + 1) : exercise),
      });
      return;
    }
    updateVisibleWorkouts((current) => current.map((item) => item.id !== workout.id ? item : {
      ...item,
      exercises: item.exercises.map((exercise) => exercise.id === exerciseId ? updateExercisePrescription(exercise, { targetSets: exercise.targetSets + 1 }) : exercise),
    }));
  }

  function removeExerciseSet(exerciseId: string) {
    if (activeSession) {
      setActiveSession((current) => !current ? current : {
        ...current,
        exercises: current.exercises.map((exercise) => exercise.id === exerciseId ? resizeActiveExerciseSets(exercise, exercise.targetSets - 1) : exercise),
      });
      return;
    }
    updateVisibleWorkouts((current) => current.map((item) => item.id !== workout.id ? item : {
      ...item,
      exercises: item.exercises.map((exercise) => exercise.id === exerciseId ? updateExercisePrescription(exercise, { targetSets: exercise.targetSets - 1 }) : exercise),
    }));
  }

  function editRoutine(edit: RoutineEdit) {
    if (activeSession) return;
    updateVisibleWorkouts((current) => editWorkoutRoutine(current, workout.id, edit, records));
  }

  function moveExercise(exerciseId: string, direction: -1 | 1) {
    const targetWorkoutId = activeSession?.workoutId ?? workout.id;
    updateVisibleWorkouts((current) => current.map((item) => item.id === targetWorkoutId ? moveWorkoutExercise(item, exerciseId, direction) : item));
    setActiveSession((current) => current ? { ...current, exercises: moveWorkoutExercise({ id: current.workoutId, title: current.workoutTitle, focus: current.focus, exercises: current.exercises }, exerciseId, direction).exercises } : current);
  }

  function cancelWorkout() {
    Alert.alert("Cancel workout?", "Your changes from this active session will be discarded.", [
      { text: "Keep training", style: "cancel" },
      { text: "Cancel workout", style: "destructive", onPress: () => setActiveSession(null) },
    ]);
  }

  function finishWorkout() {
    if (!activeSession) return;
    if (!completedSets) return Alert.alert(summaryMode ? "Complete an exercise first" : "Log a set first", summaryMode ? "Confirm at least one exercise before finishing this workout." : "Mark your completed sets to finish this workout.");
    const complete = summaryMode ? isExerciseSummarySessionComplete(activeSession) : isSessionComplete(activeSession.exercises);
    if (!complete) {
      return Alert.alert("Finish partial workout?", `${completedSets} of ${totalSets} sets are complete. Incomplete sets will not count toward your volume or latest performance.`, [
        { text: "Keep training", style: "cancel" },
        { text: "Finish anyway", onPress: saveFinishedWorkout },
      ]);
    }
    saveFinishedWorkout();
  }

  function changeExerciseSummary(exerciseId: string, changes: Parameters<typeof updateExerciseSummary>[2]) {
    setActiveSession((current) => current ? updateExerciseSummary(current, exerciseId, changes) : current);
  }

  function finishExerciseSummary(exerciseId: string) {
    setActiveSession((current) => current ? completeExerciseSummary(current, exerciseId) : current);
  }

  function reopenSummary(exerciseId: string) {
    setActiveSession((current) => current ? reopenExerciseSummary(current, exerciseId) : current);
  }

  function saveFinishedWorkout() {
    if (!activeSession) return;
    const record = completeActiveSession(activeSession);
    setRecords((current) => sortSessionRecords([record, ...current]));
    updateVisibleWorkouts((current) => applySessionPerformance(current, activeSession));
    setActiveSession(null);
    const volumeMessage = record.volume === null
      ? "volume unavailable because reps were not tracked"
      : `${displayWeight(record.volume, settings.weightUnit).toLocaleString()} ${weightUnitLabel(settings.weightUnit)} volume`;
    Alert.alert("Workout saved", `${completedSets} sets logged · ${volumeMessage}`);
    setView("history");
  }

  function applyProgram() {
    if (activeSession) {
      setView("log");
      return Alert.alert("Workout in progress", "Finish or cancel your active workout before changing the program.");
    }
    setWorkouts((current) => generateAdaptiveProgram(trainingDays, coachingProfile, current));
    setPhase(coachingProfile.goal === "strength" ? "strength" : "hypertrophy");
    setRoutineStartedAt(new Date().toISOString());
    setRoutineChangeDeferred(false);
    setPreviousRoutine(null);
    routinePromptShown.current = false;
    setSelected(0);
    setView("log");
    Alert.alert("Program generated", `Your ${trainingDays}-day ${coachingProfile.goal.replaceAll("-", " ")} plan is ready. It uses your equipment, experience, and ${coachingProfile.sessionMinutes}-minute session target.`);
  }

  function rotateRoutine() {
    if (activeSession) {
      setView("log");
      return Alert.alert("Workout in progress", "Finish or cancel your active workout before changing the routine.");
    }
    setPreviousRoutine({ workouts, routineStartedAt, routineChangeDeferred: routineChangeDeferred || isRoutineChangeDue(routineStartedAt) });
    setWorkouts((current) => rotateIsolationExercises(current, coachingProfile, records));
    setRoutineStartedAt(new Date().toISOString());
    setRoutineChangeDeferred(false);
    routinePromptShown.current = false;
    setSelected(0);
    setView("log");
    Alert.alert("Routine refreshed", "Compound movements were preserved and isolation exercises were rotated for a fresh six-week block.");
  }

  function requestPreviousRoutineRestore() {
    if (!previousRoutine) return;
    if (activeSession) {
      setView("log");
      return Alert.alert("Workout in progress", "Finish or cancel your active workout before restoring the previous routine.");
    }
    Alert.alert(
      "Restore previous routine?",
      "This will replace the refreshed routine with the one you had before restructuring.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", onPress: restorePreviousRoutine },
      ],
    );
  }

  function restorePreviousRoutine() {
    if (!previousRoutine) return;
    setWorkouts(previousRoutine.workouts);
    setRoutineStartedAt(previousRoutine.routineStartedAt);
    setRoutineChangeDeferred(previousRoutine.routineChangeDeferred);
    setPreviousRoutine(null);
    routinePromptShown.current = previousRoutine.routineChangeDeferred;
    setSelected(0);
    setView("log");
    Alert.alert("Previous routine restored", "Your routine from before the restructure is active again.");
  }

  function requestRoutineRotation() {
    Alert.alert("Refresh isolation exercises?", "Your compound list will stay unchanged. Isolation exercises will be replaced with suitable alternatives for the same muscles and movement roles.", [
      { text: "Cancel", style: "cancel" },
      { text: "Restructure", onPress: rotateRoutine },
    ]);
  }

  function openReplacement(exerciseId: string) {
    setAddingExercise(false);
    setReplacementExerciseId((current) => current === exerciseId ? null : exerciseId);
  }

  function openExerciseAddition() {
    setReplacementExerciseId(null);
    setAddingExercise((current) => !current);
  }

  function chooseAddition(definition: ExerciseDefinition) {
    const targetWorkoutId = activeSession?.workoutId ?? workout.id;
    if (activeSession) {
      const temporaryWorkoutId = `active-${activeSession.id}`;
      const activeWorkout: Workout = { id: temporaryWorkoutId, title: activeSession.workoutTitle, focus: activeSession.focus, exercises: activeSession.exercises };
      const updatedActive = addWorkoutExercise([...visibleWorkouts, activeWorkout], temporaryWorkoutId, definition, records).find((item) => item.id === temporaryWorkoutId);
      if (updatedActive) setActiveSession((current) => {
        if (!current) return current;
        const exercises = current.exerciseLogFormat === "exercise-summary-v1"
          ? updatedActive.exercises.map((exercise) => current.exercises.some((item) => item.id === exercise.id) ? exercise : startExerciseSummarySession({ ...updatedActive, exercises: [exercise] }, records).exercises[0])
          : updatedActive.exercises;
        return { ...current, exercises };
      });
    }
    updateVisibleWorkouts((current) => addWorkoutExercise(current, targetWorkoutId, definition, records));
    setAddingExercise(false);
    Alert.alert("Exercise added", `${canonicalExerciseName(definition)} was added to this workout as a separate exercise.`);
  }

  function requestExerciseRemoval(exerciseId: string) {
    const exercise = displayedWorkout.exercises.find((item) => item.id === exerciseId);
    if (displayedWorkout.exercises.length <= 1) return Alert.alert("Exercise required", "A workout must contain at least one exercise.");
    Alert.alert("Remove exercise?", `${exercise?.name ?? "This exercise"} will be removed from this workout.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => {
        const targetWorkoutId = activeSession?.workoutId ?? workout.id;
        updateVisibleWorkouts((current) => removeWorkoutExercise(current, targetWorkoutId, exerciseId));
        setActiveSession((current) => {
          if (!current || current.exercises.length <= 1) return current;
          const exercises = current.exercises.filter((item) => item.id !== exerciseId);
          return { ...current, focusedExerciseId: current.focusedExerciseId === exerciseId ? exercises[0]?.id : current.focusedExerciseId, exercises };
        });
      } },
    ]);
  }

  function applyReplacement(replacement: ExerciseDefinition) {
    if (!replacementExerciseId) return;
    if (activeSession) {
      const temporaryWorkoutId = `active-${activeSession.id}`;
      const activeWorkout: Workout = { id: temporaryWorkoutId, title: activeSession.workoutTitle, focus: activeSession.focus, exercises: activeSession.exercises };
      const replacedActiveWorkout = replaceWorkoutExercise([...visibleWorkouts, activeWorkout], temporaryWorkoutId, replacementExerciseId, replacement, records).find((item) => item.id === temporaryWorkoutId);
      if (replacedActiveWorkout) {
        setActiveSession((current) => !current ? current : {
          ...current,
          focusedExerciseId: current.focusedExerciseId === replacementExerciseId ? replacement.id : current.focusedExerciseId,
          exercises: current.exerciseLogFormat === "exercise-summary-v1"
            ? replacedActiveWorkout.exercises.map((exercise) => exercise.id === replacement.id ? startExerciseSummarySession({ ...replacedActiveWorkout, exercises: [exercise] }, records).exercises[0] : exercise)
            : replacedActiveWorkout.exercises,
        });
      }
      updateVisibleWorkouts((current) => replaceWorkoutExercise(current, activeSession.workoutId, replacementExerciseId, replacement, records));
    } else {
      updateVisibleWorkouts((current) => replaceWorkoutExercise(current, workout.id, replacementExerciseId, replacement, records));
    }
    setReplacementExerciseId(null);
    setAddingExercise(false);
  }

  function chooseReplacement(replacement: ExerciseDefinition) {
    if (!replacementExerciseId) return;
    const replaced = displayedWorkout.exercises.find((exercise) => exercise.id === replacementExerciseId);
    if (replaced?.sets.some((set) => set.completed)) {
      Alert.alert("Replace logged exercise?", `Completed sets for ${replaced.name} will be cleared when it is replaced with ${replacement.name}.`, [
        { text: "Keep exercise", style: "cancel" },
        { text: "Replace", style: "destructive", onPress: () => applyReplacement(replacement) },
      ]);
      return;
    }
    applyReplacement(replacement);
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

  function updateRecordExerciseName(recordId: string, exerciseId: string, name: string) {
    setRecords((current) => renameSessionExercise(current, recordId, exerciseId, canonicalExerciseName({ id: exerciseId, name })));
  }

  function decideRecommendation(recommendation: CoachingRecommendation, selectedWeight: number, rejected = false) {
    const outcome: CoachingDecision["outcome"] = rejected ? "rejected" : selectedWeight === recommendation.suggestedWeight ? "accepted" : "modified";
    if (!rejected) updateVisibleWorkouts((current) => applyCoachingRecommendation(current, recommendation, selectedWeight));
    setCoachingDecisions((current) => [{ recommendationId: recommendation.id, decidedAt: new Date().toISOString(), outcome, selectedWeight }, ...current]);
  }

  function beginWorkout() {
    const deload = deloadWorkoutIds.has(workout.id);
    setActiveSession(deload ? startDeloadExerciseSummarySession(workout, records) : startExerciseSummarySession(workout, records));
    if (deload) setDeloadWorkoutIds((current) => {
      const next = new Set(current);
      next.delete(workout.id);
      return next;
    });
  }

  function toggleDeload() {
    setDeloadWorkoutIds((current) => {
      const next = new Set(current);
      if (next.has(workout.id)) next.delete(workout.id);
      else next.add(workout.id);
      return next;
    });
  }

  function repeatWorkout(record: SessionRecord, deload = false) {
    if (activeSession) {
      setView("log");
      return Alert.alert("Workout in progress", "Finish or cancel your active workout before repeating a saved session.");
    }
    const repeated = repeatExerciseSummarySession(record, records, new Date(), visibleWorkouts, deload);
    const workoutIndex = visibleWorkouts.findIndex((item) => item.id === repeated.workoutId);
    if (workoutIndex >= 0) setSelected(workoutIndex);
    setActiveSession(repeated);
    setReplacementExerciseId(null);
    setAddingExercise(false);
    setView("log");
    Alert.alert(deload ? "Deload ready" : "Workout ready", `${record.workoutTitle.split(" · ").pop()} has been rebuilt using the latest normal working weight recorded for each exercise${deload ? ", reduced to 75%" : ""}.`);
  }

  async function saveBackfill(draft: WorkoutBackfillDraft): Promise<SaveBackfillResult> {
    if (activeSession) return { ok: false, error: { code: "ACTIVE_SESSION_CONFLICT", message: "Finish your active workout before saving a missed one." } };
    const finalized = finalizeWorkoutBackfill(draft);
    if (!finalized.ok) return finalized;
    const inserted = insertSessionRecord(recordsRef.current, finalized.value);
    if (!inserted.ok) return inserted;
    const nextState = appState(inserted.value);
    try {
      await enqueueAppStateSave(nextState);
    } catch (error: unknown) {
      console.warn("GymJournal: unable to save missed workout.", error);
      setStorageError("Changes could not be saved. Check available device storage.");
      return { ok: false, error: { code: "STORAGE_WRITE_FAILED", message: "The missed workout could not be saved. Check device storage and try again." } };
    }
    recordsRef.current = inserted.value;
    setRecords(inserted.value);
    setStorageError(null);
    return { ok: true, value: { recordId: finalized.value.id } };
  }

  function createTemporaryPlanDraft(startsAt: string, endsAt: string, trainingSplit: TrainingSplit) {
    if (activeSession) return Alert.alert("Workout in progress", "Finish or cancel your active workout before creating a temporary plan.");
    const error = validateTemporaryPlanDates(startsAt, endsAt);
    if (error) return Alert.alert("Check the dates", error);
    const resolvedSplit = trainingSplit === "auto" ? recommendedTrainingSplit(3, coachingProfile.coachingStyle) : trainingSplit;
    const draftWorkouts = generateAdaptiveProgram(3, { ...coachingProfile, trainingSplit: resolvedSplit }, workouts);
    const draft = createTemporaryPlan(draftWorkouts, startsAt, endsAt, resolvedSplit);
    setTemporaryPlans((current) => [draft, ...current.filter((plan) => plan.status === "completed")]);
    setEditingTemporaryPlanId(draft.id);
    setSelected(0);
    setView("log");
    Alert.alert("Temporary plan draft ready", "Review all three days. You can add, remove, replace, reorder, or adjust exercises and sets before activating it.");
  }

  function editTemporaryPlan(planId: string) {
    if (activeSession) return Alert.alert("Workout in progress", "Finish or cancel your active workout before editing a plan.");
    setEditingTemporaryPlanId(planId);
    setSelected(0);
    setView("log");
  }

  function saveTemporaryDraftWorkout(updatedWorkout: Workout) {
    if (!editingTemporaryPlanId) return;
    setTemporaryPlans((current) => updateTemporaryPlanDraftWorkout(current, editingTemporaryPlanId, updatedWorkout));
    Alert.alert("Draft workout saved", `${updatedWorkout.title} is updated. Review another day or return to Program when the split is ready.`);
  }

  function closeTemporaryDraftEditor() {
    setEditingTemporaryPlanId(null);
    setSelected(0);
    setView("program");
  }

  function activateTemporaryPlan(planId: string, startsAt: string, endsAt: string) {
    if (activeSession) return Alert.alert("Workout in progress", "Finish or cancel your active workout before activating a plan.");
    const error = validateTemporaryPlanDates(startsAt, endsAt);
    if (error) return Alert.alert("Check the dates", error);
    setTemporaryPlans((current) => current.map((plan) => plan.id === planId
      ? { ...plan, startsAt, endsAt, status: "active" }
      : plan.status === "active" ? { ...plan, status: "completed" } : plan));
    setEditingTemporaryPlanId(null);
    setSelected(0);
    setView("log");
    Alert.alert("Temporary plan activated", `Your permanent routine is safely stored. This plan runs from ${startsAt} through ${endsAt}, then GymJournal restores your regular routine automatically.`);
  }

  function endTemporaryPlan(planId: string) {
    if (activeSession) return Alert.alert("Workout in progress", "Finish or cancel the current workout before ending the temporary plan.");
    Alert.alert("Resume regular routine?", "The temporary plan will be kept in Past Temporary Plans and your permanent split will return immediately.", [
      { text: "Cancel", style: "cancel" },
      { text: "End plan", style: "destructive", onPress: () => {
        setTemporaryPlans((current) => current.map((plan) => plan.id === planId ? { ...plan, status: "completed" } : plan));
        setEditingTemporaryPlanId(null);
        setSelected(0);
        setView("log");
      } },
    ]);
  }

  function discardTemporaryPlan(planId: string) {
    if (activeSession) return Alert.alert("Workout in progress", "Finish or cancel your active workout before discarding a draft.");
    Alert.alert("Discard temporary plan draft?", "This removes the unactivated draft. Your permanent routine will not be changed.", [
      { text: "Keep draft", style: "cancel" },
      { text: "Discard draft", style: "destructive", onPress: () => {
        setTemporaryPlans((current) => current.filter((plan) => plan.id !== planId));
        setEditingTemporaryPlanId(null);
        setSelected(0);
        setView("program");
      } },
    ]);
  }

  function reuseTemporaryPlan(planId: string, startsAt: string, endsAt: string) {
    const source = temporaryPlans.find((plan) => plan.id === planId);
    if (!source) return;
    const error = validateTemporaryPlanDates(startsAt, endsAt);
    if (error) return Alert.alert("Check the dates", error);
    const draft = createTemporaryPlan(source.workouts, startsAt, endsAt, source.trainingSplit ?? "auto");
    setTemporaryPlans((current) => [draft, ...current]);
    editTemporaryPlan(draft.id);
  }

  function makeTemporaryPlanRegular(planId: string) {
    if (activeSession) return Alert.alert("Workout in progress", "Finish or cancel your active workout before changing the regular routine.");
    const plan = temporaryPlans.find((item) => item.id === planId);
    if (!plan) return;
    Alert.alert("Make this your regular plan?", "This replaces your current permanent routine with this three-day plan. The temporary copy will still be retained in Past Temporary Plans.", [
      { text: "Cancel", style: "cancel" },
      { text: "Make regular", onPress: () => {
        setWorkouts(plan.workouts);
        setTrainingDays(plan.workouts.length);
        setCoachingProfile((current) => ({ ...current, trainingSplit: plan.trainingSplit ?? "auto" }));
        setRoutineStartedAt(new Date().toISOString());
        setRoutineChangeDeferred(false);
        setPreviousRoutine(null);
        setTemporaryPlans((current) => current.map((item) => item.id === planId ? { ...item, status: "completed" } : item));
        setEditingTemporaryPlanId(null);
        setSelected(0);
        setView("log");
      } },
    ]);
  }

  function appState(recordValues = records): AppState {
    return { workouts, records: recordValues, program: { trainingDays, phase, routineStartedAt, routineChangeDeferred }, activeSession, coachingProfile, coachingDecisions, settings, temporaryPlans, previousRoutine };
  }

  function selectView(nextView: AppView) {
    const change = () => {
      setBackfillNavigation({ active: false, dirty: false });
      setReplacementExerciseId(null);
      setAddingExercise(false);
      setView(nextView);
      workoutScrollOffset.current = 0;
      workoutScroll.current?.scrollTo({ y: 0, animated: false });
    };
    if (nextView !== "history" && backfillNavigation.active && backfillNavigation.dirty) {
      Alert.alert("Discard this missed workout?", "Your set changes and notes will be lost.", [{ text: "Keep editing", style: "cancel" }, { text: "Discard", style: "destructive", onPress: change }]);
      return;
    }
    change();
  }

  if (!loaded) return <SafeAreaView style={styles.safe}><StatusBar style="light" /><View accessibilityRole="progressbar" style={styles.loading}><Text style={styles.loadingTitle}>GYMJOURNAL</Text><Text style={styles.loadingText}>Loading your workouts…</Text></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><StatusBar style="light" />
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <ScrollView ref={workoutScroll} scrollEnabled={workoutScrollEnabled}
      onScroll={view === "log" && !activeSession ? (event) => { workoutScrollOffset.current = event.nativeEvent.contentOffset.y; } : undefined}
      scrollEventThrottle={16} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      {storageError && <View style={styles.storageError}><Text style={styles.storageErrorText}>{storageError}</Text></View>}
      <View style={styles.viewTabs}>{(["log", "history", "program"] as AppView[]).map((item) => <Pressable key={item} onPress={() => selectView(item)} style={[styles.viewTab, view === item && styles.viewTabActive]}><Text style={[styles.viewTabText, view === item && styles.viewTabTextActive]}>{item.toUpperCase()}</Text></Pressable>)}</View>
      {visibleTemporaryPlan && view === "log" && <View style={styles.temporaryBanner}><Text style={styles.temporaryBannerTitle}>{visibleTemporaryPlan.status === "draft" ? "TEMPORARY PLAN DRAFT" : "TEMPORARY PLAN ACTIVE"}</Text>{(activeSession || visibleTemporaryPlan.status === "draft") && <Text style={styles.temporaryBannerText}>{visibleTemporaryPlan.startsAt} → {visibleTemporaryPlan.endsAt}{visibleTemporaryPlan.status === "draft" ? " · Edit every day, then activate it from Program." : " · Your regular routine is safely stored."}</Text>}</View>}
      {view === "history" ? <HistoryScreen records={records} workouts={backfillWorkouts} activeSessionExists={Boolean(activeSession)} storageError={storageError} onSaveBackfill={saveBackfill} onBackfillStateChange={setBackfillNavigation} onRequestScrollTop={() => workoutScroll.current?.scrollTo({ y: 0, animated: false })} onReturnToActiveWorkout={() => selectView("log")} weightUnit={settings.weightUnit} onRepeat={repeatWorkout} onUpdateNotes={updateRecordNotes} onUpdateExerciseName={updateRecordExerciseName} onDelete={(recordId) => setRecords((current) => deleteSessionRecord(current, recordId))} /> : view === "program" ? <>
        <ProgramScreen trainingDays={trainingDays} profile={coachingProfile} currentRoutineWeek={routineWeek(routineStartedAt)} routineChangeAt={routineChangeDate(routineStartedAt)?.toISOString() ?? null} routineChangeDeferred={routineChangeDeferred} canRestorePreviousRoutine={previousRoutine !== null} temporaryPlans={temporaryPlans} onDays={setTrainingDays} onProfile={setCoachingProfile} onApply={applyProgram} onRotateRoutine={requestRoutineRotation} onRestorePreviousRoutine={requestPreviousRoutineRestore} onCreateTemporary={createTemporaryPlanDraft} onEditTemporary={editTemporaryPlan} onActivateTemporary={activateTemporaryPlan} onEndTemporary={endTemporaryPlan} onDiscardTemporary={discardTemporaryPlan} onReuseTemporary={reuseTemporaryPlan} onMakeTemporaryRegular={makeTemporaryPlanRegular} />
        <CoachPanel
          workoutTitle={workout.title.split(" · ").pop() ?? workout.title}
          recommendations={recommendations}
          onApply={(recommendation, weight) => decideRecommendation(recommendation, weight)}
          onReject={(recommendation) => decideRecommendation(recommendation, recommendation.currentWeight, true)}
          weightUnit={settings.weightUnit}
        />
      </> : editedTemporaryPlan?.status === "draft" && !activeSession ? <>
        <View accessibilityRole="tablist" style={styles.draftDayTabs}>{editedTemporaryPlan.workouts.map((item, index) => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: selectedWorkoutIndex === index }} accessibilityLabel={`Edit day ${index + 1}: ${item.title.split(" · ").pop()}`} onPress={() => setSelected(index)} style={[styles.draftDay, selectedWorkoutIndex === index && styles.draftDayActive]}><Text style={[styles.draftDayText, selectedWorkoutIndex === index && styles.draftDayTextActive]}>DAY {index + 1}</Text></Pressable>)}</View>
        <WorkoutEditor
          key={`${editedTemporaryPlan.id}-${workout.id}`}
          scope="split-draft"
          workout={workout}
          knownExercises={[...workouts, ...editedTemporaryPlan.workouts].flatMap((item) => item.exercises)}
          records={records}
          preferredExerciseIds={coachingProfile.preferredExerciseIds}
          excludedExerciseIds={coachingProfile.excludedExerciseIds}
          availableEquipment={coachingProfile.availableEquipment}
          onSave={saveTemporaryDraftWorkout}
          onCancel={closeTemporaryDraftEditor}
        />
      </> : <WorkoutScreen workouts={visibleWorkouts} selectedWorkoutIndex={selectedWorkoutIndex} displayedWorkout={displayedWorkout} activeSession={activeSession} deloadEnabled={deloadWorkoutIds.has(workout.id)} onDeloadToggle={toggleDeload} onSelect={setSelected} onBegin={beginWorkout} onEditRoutine={editRoutine} setupScroll={routineScroll} canStart={visibleTemporaryPlan?.status !== "draft"} onSetChange={updateSet} onFinish={finishWorkout} onCancel={cancelWorkout} onReplaceExercise={openReplacement} replacementExerciseId={replacementExerciseId} preferredExerciseIds={coachingProfile.preferredExerciseIds} onChooseReplacement={chooseReplacement} onCancelReplacement={() => setReplacementExerciseId(null)} onRemoveExercise={requestExerciseRemoval} onAddExercise={openExerciseAddition} addingExercise={addingExercise} onChooseAddition={chooseAddition} onCancelAddition={() => setAddingExercise(false)} onLoadingType={setLoadingType} onAddSet={addExerciseSet} onRemoveSet={removeExerciseSet} onMoveExercise={moveExercise} onNotesChange={(notes) => setActiveSession((current) => current ? { ...current, notes } : current)} weightUnit={settings.weightUnit} defaultRestSeconds={settings.defaultRestSeconds} onFocusedExerciseChange={focusExercise} onExerciseLayout={registerExerciseLayout} onWorkingLoadChange={setThreeByThreeWorkingLoad} onSummaryChange={changeExerciseSummary} onSummaryComplete={finishExerciseSummary} onSummaryReopen={reopenSummary} />}
    </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#101311" }, keyboard: { flex: 1 }, page: { padding: 20, paddingBottom: 42 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }, loadingTitle: { color: "#d8ff38", fontSize: 18, fontWeight: "900", letterSpacing: 1.2 }, loadingText: { color: "#aab3a7", fontSize: 12, marginTop: 8 },
  storageError: { backgroundColor: "#3b211d", borderColor: "#d36b5b", borderWidth: 1, borderRadius: 7, padding: 11, marginTop: 10 }, storageErrorText: { color: "#ffd6cf", fontSize: 11, lineHeight: 16, fontWeight: "700" },
  viewTabs: { flexDirection: "row", backgroundColor: "#1a1f1a", borderRadius: 8, padding: 4, marginTop: 22, gap: 4 }, viewTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 5 }, viewTabActive: { backgroundColor: "#d8ff38" }, viewTabText: { color: "#848c82", fontSize: 9, fontWeight: "900", letterSpacing: .5 }, viewTabTextActive: { color: "#15190f" },
  temporaryBanner: { backgroundColor: "#202917", borderWidth: 1, borderColor: "#809b25", borderRadius: 8, padding: 12, marginTop: 16 }, temporaryBannerTitle: { color: "#d8ff38", fontSize: 10, fontWeight: "900", letterSpacing: 1 }, temporaryBannerText: { color: "#aab4a4", fontSize: 10, lineHeight: 15, marginTop: 5 },
  draftDayTabs: { flexDirection: "row", gap: 7, marginTop: 16, marginBottom: 18 }, draftDay: { flex: 1, minHeight: 44, borderRadius: 7, justifyContent: "center", alignItems: "center", backgroundColor: "#1a1f1a", borderWidth: 1, borderColor: "#343c33" }, draftDayActive: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, draftDayText: { color: "#a2aba0", fontWeight: "900", fontSize: 10 }, draftDayTextActive: { color: "#141710" },
});
