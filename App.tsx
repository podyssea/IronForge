import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, LayoutChangeEvent, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActiveSession, addWorkoutExercise, applySessionPerformance, applyWarmupLoads, completeActiveSession, displayWeight, initialFourDaySplit, isSessionComplete, LoadingType, moveWorkoutExercise, removeWorkoutExercise, repeatSessionFromRecord, replaceWorkoutExercise, resizeActiveExerciseSets, SessionRecord, setValidationError, SetLog, startActiveSession, startDeloadSession, TrainingPhase, updateExercisePrescription, weightUnitLabel, Workout } from "./src/domain/training";
import { ExerciseDefinition } from "./src/domain/exerciseLibrary";
import { generateAdaptiveProgram, isRoutineChangeDue, recommendedTrainingSplit, rotateIsolationExercises, routineWeek, TrainingSplit } from "./src/domain/programGenerator";
import { deleteSessionRecord, recentSixWeekRecords, renameSessionExercise } from "./src/domain/sessionJournal";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { ProgramScreen } from "./src/screens/ProgramScreen";
import { WorkoutScreen } from "./src/screens/WorkoutScreen";
import { ExerciseLibraryScreen } from "./src/screens/ExerciseLibraryScreen";
import { AppState, loadAppState, saveAppState } from "./src/storage/appStorage";
import { pickAppBackup, shareAppBackup } from "./src/storage/backupFiles";
import { AppSettings, DEFAULT_APP_SETTINGS } from "./src/storage/migrations";
import { applyCoachingRecommendation, buildWorkoutRecommendations, CoachingDecision, CoachingProfile, CoachingRecommendation, DEFAULT_COACHING_PROFILE, fixedTrainingProfile } from "./src/domain/coaching";
import { completeExpiredTemporaryPlans, createTemporaryPlan, isTemporaryPlanCurrent, TemporaryTrainingPlan, validateTemporaryPlanDates } from "./src/domain/temporaryPlan";

type AppView = "log" | "history" | "program" | "library";

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
  const [backupBusy, setBackupBusy] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [deloadWorkoutIds, setDeloadWorkoutIds] = useState<Set<string>>(() => new Set());
  const [temporaryPlans, setTemporaryPlans] = useState<TemporaryTrainingPlan[]>([]);
  const [editingTemporaryPlanId, setEditingTemporaryPlanId] = useState<string | null>(null);
  const routinePromptShown = useRef(false);
  const workoutScroll = useRef<ScrollView>(null);
  const exerciseOffsets = useRef<Record<string, number>>({});
  const pendingFocusedExerciseId = useRef<string | null>(null);

  useEffect(() => {
    loadAppState().then((state) => {
      setWorkouts(state.workouts);
      setTemporaryPlans(completeExpiredTemporaryPlans(state.temporaryPlans));
      setRecords(recentSixWeekRecords(state.records));
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
    saveAppState({ workouts, records, program: { trainingDays, phase, routineStartedAt, routineChangeDeferred }, activeSession, coachingProfile, coachingDecisions, settings, temporaryPlans })
      .then(() => setStorageError(null))
      .catch((error: unknown) => {
        console.warn("GymJournal: unable to save app data.", error);
        setStorageError("Changes could not be saved. Check available device storage.");
      });
  }, [workouts, records, trainingDays, phase, routineStartedAt, routineChangeDeferred, activeSession, coachingProfile, coachingDecisions, settings, temporaryPlans, loaded]);

  const activeTemporaryPlan = temporaryPlans.find((plan) => isTemporaryPlanCurrent(plan));
  const sessionTemporaryPlan = activeSession ? temporaryPlans.find((plan) => plan.workouts.some((item) => item.id === activeSession.workoutId)) : undefined;
  const editedTemporaryPlan = temporaryPlans.find((plan) => plan.id === editingTemporaryPlanId);
  const visibleTemporaryPlan = editedTemporaryPlan ?? activeTemporaryPlan ?? sessionTemporaryPlan;
  const visibleWorkouts = visibleTemporaryPlan?.workouts ?? workouts;
  const selectedWorkoutIndex = selected < visibleWorkouts.length ? selected : 0;
  const workout = visibleWorkouts[selectedWorkoutIndex];
  const displayedWorkout: Workout = activeSession ? { id: activeSession.workoutId, title: activeSession.workoutTitle, focus: activeSession.focus, exercises: activeSession.exercises } : workout;
  const completedSets = displayedWorkout.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set, index) => set.completed && !setValidationError(set, exercise, index)).length, 0);
  const totalSets = displayedWorkout.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0);
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
      exercises: current.exercises.map((exercise) => exercise.id !== exerciseId ? exercise : {
        ...exercise,
        sets: exercise.sets.map((set, index) => index === setIndex ? { ...set, ...changes } : set),
      }),
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
          const recalculated = applyWarmupLoads({ ...exercise, lastWeight: weight, lastReps: 3 }, weight);
          return {
            ...recalculated,
            sets: recalculated.sets.map((set, index) => exercise.sets[index]?.completed ? exercise.sets[index] : set),
          };
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
    setRecords((current) => recentSixWeekRecords([record, ...current]));
    updateVisibleWorkouts((current) => applySessionPerformance(current, activeSession));
    setActiveSession(null);
    Alert.alert("Workout saved", `${completedSets} sets logged · ${displayWeight(record.volume, settings.weightUnit).toLocaleString()} ${weightUnitLabel(settings.weightUnit)} volume`);
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
    setWorkouts((current) => rotateIsolationExercises(current, coachingProfile, records));
    setRoutineStartedAt(new Date().toISOString());
    setRoutineChangeDeferred(false);
    routinePromptShown.current = false;
    setSelected(0);
    setView("log");
    Alert.alert("Routine refreshed", "Compound movements were preserved and isolation exercises were rotated for a fresh six-week block.");
  }

  function requestRoutineRotation() {
    Alert.alert("Refresh isolation exercises?", "Your compound list will stay unchanged. Isolation exercises will be replaced with suitable alternatives for the same muscles and movement roles.", [
      { text: "Cancel", style: "cancel" },
      { text: "Restructure", onPress: rotateRoutine },
    ]);
  }

  function openReplacement(exerciseId: string) {
    setAddingExercise(false);
    setReplacementExerciseId(exerciseId);
    setView("library");
  }

  function openExerciseAddition() {
    setReplacementExerciseId(null);
    setAddingExercise(true);
    setView("library");
  }

  function chooseAddition(definition: ExerciseDefinition) {
    const targetWorkoutId = activeSession?.workoutId ?? workout.id;
    if (activeSession) {
      const temporaryWorkoutId = `active-${activeSession.id}`;
      const activeWorkout: Workout = { id: temporaryWorkoutId, title: activeSession.workoutTitle, focus: activeSession.focus, exercises: activeSession.exercises };
      const updatedActive = addWorkoutExercise([...visibleWorkouts, activeWorkout], temporaryWorkoutId, definition, records).find((item) => item.id === temporaryWorkoutId);
      if (updatedActive) setActiveSession((current) => current ? { ...current, exercises: updatedActive.exercises } : current);
    }
    updateVisibleWorkouts((current) => addWorkoutExercise(current, targetWorkoutId, definition, records));
    setAddingExercise(false);
    setView("log");
    Alert.alert("Exercise added", `${definition.name} was added to this workout as a separate exercise.`);
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

  function chooseReplacement(replacement: ExerciseDefinition) {
    if (!replacementExerciseId) return;
    const replaced = displayedWorkout.exercises.find((exercise) => exercise.id === replacementExerciseId);
    if (activeSession) {
      const temporaryWorkoutId = `active-${activeSession.id}`;
      const activeWorkout: Workout = { id: temporaryWorkoutId, title: activeSession.workoutTitle, focus: activeSession.focus, exercises: activeSession.exercises };
      const replacedActiveWorkout = replaceWorkoutExercise([...visibleWorkouts, activeWorkout], temporaryWorkoutId, replacementExerciseId, replacement, records).find((item) => item.id === temporaryWorkoutId);
      if (replacedActiveWorkout) {
        setActiveSession((current) => !current ? current : {
          ...current,
          focusedExerciseId: current.focusedExerciseId === replacementExerciseId ? replacement.id : current.focusedExerciseId,
          exercises: replacedActiveWorkout.exercises,
        });
      }
      updateVisibleWorkouts((current) => replaceWorkoutExercise(current, activeSession.workoutId, replacementExerciseId, replacement, records));
    } else {
      updateVisibleWorkouts((current) => replaceWorkoutExercise(current, workout.id, replacementExerciseId, replacement, records));
    }
    setReplacementExerciseId(null);
    setAddingExercise(false);
    setView("log");
    Alert.alert("Exercise replaced", `${replaced?.name ?? "Exercise"} was replaced with ${replacement.name}. Your set and rep prescription was retained${activeSession ? " for this session" : ""}.`);
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
    setRecords((current) => renameSessionExercise(current, recordId, exerciseId, name));
  }

  function decideRecommendation(recommendation: CoachingRecommendation, selectedWeight: number, rejected = false) {
    const outcome: CoachingDecision["outcome"] = rejected ? "rejected" : selectedWeight === recommendation.suggestedWeight ? "accepted" : "modified";
    if (!rejected) setWorkouts((current) => applyCoachingRecommendation(current, recommendation, selectedWeight));
    setCoachingDecisions((current) => [{ recommendationId: recommendation.id, decidedAt: new Date().toISOString(), outcome, selectedWeight }, ...current]);
  }

  function beginWorkout() {
    const deload = deloadWorkoutIds.has(workout.id);
    setActiveSession(deload ? startDeloadSession(workout) : startActiveSession(workout));
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
    const repeated = repeatSessionFromRecord(record, records, new Date(), visibleWorkouts, deload);
    const workoutIndex = visibleWorkouts.findIndex((item) => item.id === repeated.workoutId);
    if (workoutIndex >= 0) setSelected(workoutIndex);
    setActiveSession(repeated);
    setReplacementExerciseId(null);
    setAddingExercise(false);
    setView("log");
    Alert.alert(deload ? "Deload ready" : "Workout ready", `${record.workoutTitle.split(" · ").pop()} has been rebuilt using the latest normal working weight recorded for each exercise${deload ? ", reduced to 75%" : ""}.`);
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
        setTemporaryPlans((current) => current.map((item) => item.id === planId ? { ...item, status: "completed" } : item));
        setEditingTemporaryPlanId(null);
        setSelected(0);
        setView("log");
      } },
    ]);
  }

  function appState(): AppState {
    return { workouts, records, program: { trainingDays, phase, routineStartedAt, routineChangeDeferred }, activeSession, coachingProfile, coachingDecisions, settings, temporaryPlans };
  }

  async function exportBackup() {
    setBackupBusy(true);
    try {
      await shareAppBackup(appState());
    } catch (error: unknown) {
      Alert.alert("Backup not saved", error instanceof Error ? error.message : "GymJournal could not create the backup.");
    } finally {
      setBackupBusy(false);
    }
  }

  async function importBackup() {
    setBackupBusy(true);
    try {
      const restored = await pickAppBackup();
      if (!restored) return;
      const date = new Date(restored.summary.exportedAt);
      const exported = Number.isNaN(date.getTime()) ? restored.summary.exportedAt : date.toLocaleString();
      Alert.alert(
        "Restore this backup?",
        `Backup from ${exported}\n${restored.summary.workouts} workouts · ${restored.summary.sessions} saved sessions\n\nThis will replace the data currently in GymJournal.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Restore", style: "destructive", onPress: () => applyRestoredState(restored.state) },
        ],
      );
    } catch (error: unknown) {
      Alert.alert("Backup not restored", error instanceof Error ? error.message : "GymJournal could not read this backup.");
    } finally {
      setBackupBusy(false);
    }
  }

  function applyRestoredState(state: AppState) {
    setWorkouts(state.workouts);
    setTemporaryPlans(completeExpiredTemporaryPlans(state.temporaryPlans));
    setRecords(recentSixWeekRecords(state.records));
    setTrainingDays(state.program.trainingDays);
    setPhase(state.program.phase);
    setRoutineStartedAt(state.program.routineStartedAt);
    setRoutineChangeDeferred(state.program.routineChangeDeferred);
    setActiveSession(state.activeSession);
    setCoachingProfile(fixedTrainingProfile(state.coachingProfile));
    setCoachingDecisions(state.coachingDecisions);
    setSettings({ ...DEFAULT_APP_SETTINGS });
    const activeIndex = state.activeSession ? state.workouts.findIndex((item) => item.id === state.activeSession?.workoutId) : 0;
    setSelected(activeIndex >= 0 ? activeIndex : 0);
    setReplacementExerciseId(null);
    setAddingExercise(false);
    setView(state.activeSession ? "log" : "history");
    Alert.alert("Backup restored", "Your GymJournal progress and settings are back on this phone.");
  }

  return <SafeAreaView style={styles.safe}><StatusBar style="light" />
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <ScrollView ref={workoutScroll} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      {storageError && <View style={styles.storageError}><Text style={styles.storageErrorText}>{storageError}</Text></View>}
      <View style={styles.viewTabs}>{(["log", "history", "program", "library"] as AppView[]).map((item) => <Pressable key={item} onPress={() => { setReplacementExerciseId(null); setAddingExercise(false); setView(item); }} style={[styles.viewTab, view === item && styles.viewTabActive]}><Text style={[styles.viewTabText, view === item && styles.viewTabTextActive]}>{item.toUpperCase()}</Text></Pressable>)}</View>
      {visibleTemporaryPlan && view === "log" && <View style={styles.temporaryBanner}><Text style={styles.temporaryBannerTitle}>{visibleTemporaryPlan.status === "draft" ? "TEMPORARY PLAN DRAFT" : "TEMPORARY PLAN ACTIVE"}</Text><Text style={styles.temporaryBannerText}>{visibleTemporaryPlan.startsAt} → {visibleTemporaryPlan.endsAt}{visibleTemporaryPlan.status === "draft" ? " · Edit every day, then activate it from Program." : " · Your regular routine is safely stored."}</Text></View>}
      {view === "history" ? <HistoryScreen records={records} weightUnit={settings.weightUnit} onRepeat={repeatWorkout} onUpdateNotes={updateRecordNotes} onUpdateExerciseName={updateRecordExerciseName} onDelete={(recordId) => setRecords((current) => deleteSessionRecord(current, recordId))} /> : view === "program" ? <ProgramScreen trainingDays={trainingDays} profile={coachingProfile} backupBusy={backupBusy} currentRoutineWeek={routineWeek(routineStartedAt)} routineChangeDeferred={routineChangeDeferred} temporaryPlans={temporaryPlans} onDays={setTrainingDays} onProfile={setCoachingProfile} onApply={applyProgram} onRotateRoutine={requestRoutineRotation} onExportBackup={exportBackup} onImportBackup={importBackup} onCreateTemporary={createTemporaryPlanDraft} onEditTemporary={editTemporaryPlan} onActivateTemporary={activateTemporaryPlan} onEndTemporary={endTemporaryPlan} onDiscardTemporary={discardTemporaryPlan} onReuseTemporary={reuseTemporaryPlan} onMakeTemporaryRegular={makeTemporaryPlanRegular} /> : view === "library" ? <ExerciseLibraryScreen selectionMode={addingExercise ? "add" : replacementExerciseId ? "replace" : undefined} replacementForId={replacementExerciseId ?? undefined} excludedIds={replacementExerciseId ? displayedWorkout.exercises.filter((exercise) => exercise.id !== replacementExerciseId).map((exercise) => exercise.id) : addingExercise ? displayedWorkout.exercises.map((exercise) => exercise.id) : []} preferredIds={coachingProfile.preferredExerciseIds} profileExcludedIds={coachingProfile.excludedExerciseIds} onPreference={setExercisePreference} onSelect={addingExercise ? chooseAddition : replacementExerciseId ? chooseReplacement : undefined} onCancelSelection={() => { setReplacementExerciseId(null); setAddingExercise(false); setView("log"); }} /> : <WorkoutScreen workouts={visibleWorkouts} selectedWorkoutIndex={selectedWorkoutIndex} displayedWorkout={displayedWorkout} activeSession={activeSession} deloadEnabled={deloadWorkoutIds.has(workout.id)} onDeloadToggle={toggleDeload} onSelect={setSelected} onBegin={beginWorkout} canStart={visibleTemporaryPlan?.status !== "draft"} onSetChange={updateSet} onFinish={finishWorkout} onCancel={cancelWorkout} onReplaceExercise={openReplacement} onRemoveExercise={requestExerciseRemoval} onAddExercise={openExerciseAddition} onLoadingType={setLoadingType} onAddSet={addExerciseSet} onRemoveSet={removeExerciseSet} onMoveExercise={moveExercise} onNotesChange={(notes) => setActiveSession((current) => current ? { ...current, notes } : current)} recommendations={recommendations} onApplyRecommendation={(recommendation, weight) => decideRecommendation(recommendation, weight)} onRejectRecommendation={(recommendation) => decideRecommendation(recommendation, recommendation.currentWeight, true)} weightUnit={settings.weightUnit} defaultRestSeconds={settings.defaultRestSeconds} onFocusedExerciseChange={focusExercise} onExerciseLayout={registerExerciseLayout} onWorkingLoadChange={setThreeByThreeWorkingLoad} />}
    </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#101311" }, keyboard: { flex: 1 }, page: { padding: 20, paddingBottom: 42 },
  storageError: { backgroundColor: "#3b211d", borderColor: "#d36b5b", borderWidth: 1, borderRadius: 7, padding: 11, marginTop: 10 }, storageErrorText: { color: "#ffd6cf", fontSize: 11, lineHeight: 16, fontWeight: "700" },
  viewTabs: { flexDirection: "row", backgroundColor: "#1a1f1a", borderRadius: 8, padding: 4, marginTop: 22, gap: 4 }, viewTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 5 }, viewTabActive: { backgroundColor: "#d8ff38" }, viewTabText: { color: "#848c82", fontSize: 9, fontWeight: "900", letterSpacing: .5 }, viewTabTextActive: { color: "#15190f" },
  temporaryBanner: { backgroundColor: "#202917", borderWidth: 1, borderColor: "#809b25", borderRadius: 8, padding: 12, marginTop: 16 }, temporaryBannerTitle: { color: "#d8ff38", fontSize: 10, fontWeight: "900", letterSpacing: 1 }, temporaryBannerText: { color: "#aab4a4", fontSize: 10, lineHeight: 15, marginTop: 5 },
});
