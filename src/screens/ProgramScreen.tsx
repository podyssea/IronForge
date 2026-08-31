import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import { CoachingProfile } from "../domain/coaching";
import { TemporaryTrainingPlan } from "../domain/temporaryPlan";
import { recommendedTrainingSplit, TRAINING_SPLIT_OPTIONS, TrainingSplit, trainingSplitLabel } from "../domain/programGenerator";

type ProgramScreenProps = {
  trainingDays: number;
  profile: CoachingProfile;
  backupBusy: boolean;
  currentRoutineWeek: number;
  routineChangeDeferred: boolean;
  temporaryPlans: TemporaryTrainingPlan[];
  onDays: (days: number) => void;
  onProfile: (profile: CoachingProfile) => void;
  onApply: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onRotateRoutine: () => void;
  onCreateTemporary: (startsAt: string, endsAt: string, trainingSplit: TrainingSplit) => void;
  onEditTemporary: (planId: string) => void;
  onActivateTemporary: (planId: string, startsAt: string, endsAt: string) => void;
  onEndTemporary: (planId: string) => void;
  onDiscardTemporary: (planId: string) => void;
  onReuseTemporary: (planId: string, startsAt: string, endsAt: string) => void;
  onMakeTemporaryRegular: (planId: string) => void;
};

export function ProgramScreen({ trainingDays, profile, backupBusy, currentRoutineWeek, routineChangeDeferred, temporaryPlans, onDays, onProfile, onApply, onExportBackup, onImportBackup, onRotateRoutine, onCreateTemporary, onEditTemporary, onActivateTemporary, onEndTemporary, onDiscardTemporary, onReuseTemporary, onMakeTemporaryRegular }: ProgramScreenProps) {
  const update = (changes: Partial<CoachingProfile>) => onProfile({ ...profile, ...changes });
  const estimatedExercises = Math.max(4, Math.min(9, Math.floor((profile.sessionMinutes - 8) / 7)));
  const today = new Date();
  const defaultStart = localDate(today);
  const defaultEnd = localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6));
  const [temporaryStart, setTemporaryStart] = useState(defaultStart);
  const [temporaryEnd, setTemporaryEnd] = useState(defaultEnd);
  const [temporarySplit, setTemporarySplit] = useState<TrainingSplit>(profile.trainingSplit ?? "auto");
  const currentPlan = temporaryPlans.find((plan) => plan.status === "draft" || plan.status === "active");
  const pastPlans = temporaryPlans.filter((plan) => plan.status === "completed");
  useEffect(() => {
    if (!currentPlan) return;
    setTemporaryStart(currentPlan.startsAt);
    setTemporaryEnd(currentPlan.endsAt);
  }, [currentPlan?.id, currentPlan?.startsAt, currentPlan?.endsAt]);

  useEffect(() => {
    if (!currentPlan) setTemporarySplit(profile.trainingSplit ?? "auto");
  }, [currentPlan?.id, profile.trainingSplit]);

  const mainSplit = profile.trainingSplit ?? "auto";
  const resolvedMainSplit = mainSplit === "auto" ? recommendedTrainingSplit(trainingDays, profile.coachingStyle) : mainSplit;
  const resolvedTemporarySplit = temporarySplit === "auto" ? recommendedTrainingSplit(3, profile.coachingStyle) : temporarySplit;

  return <><Text style={styles.kicker}>PERSONAL COACH</Text><Text style={styles.title}>Build your program</Text>
    <Text style={styles.builderLabel}>TRAINING DAYS</Text><View style={styles.choiceRow}>{[2, 3, 4, 5].map((days) => <Pressable key={days} onPress={() => onDays(days)} style={[styles.dayChoice, trainingDays === days && styles.dayChoiceActive]}><Text style={[styles.dayChoiceText, trainingDays === days && styles.dayChoiceTextActive]}>{days}</Text><Text style={[styles.dayChoiceCaption, trainingDays === days && styles.dayChoiceTextActive]}>DAYS</Text></Pressable>)}</View>
    <Text style={styles.builderLabel}>TRAINING SPLIT</Text><View style={styles.splitList}>{TRAINING_SPLIT_OPTIONS.map((split) => <Pressable key={split.value} onPress={() => update({ trainingSplit: split.value })} style={[styles.option, mainSplit === split.value && styles.optionActive]}><View style={styles.optionCopy}><Text style={[styles.optionName, mainSplit === split.value && styles.optionNameActive]}>{split.label.toUpperCase()}</Text><Text style={styles.optionText}>{split.value === "auto" ? `${split.detail}. Recommended now: ${trainingSplitLabel(resolvedMainSplit)}.` : split.detail}</Text></View><Radio active={mainSplit === split.value} /></Pressable>)}</View>
    <View style={styles.preview}><Text style={styles.previewTitle}>{trainingDays}-day {trainingSplitLabel(resolvedMainSplit)} plan</Text><Text style={styles.previewText}>Approximately {estimatedExercises} exercises per 60-minute session. Advanced exercise options and all equipment are enabled by default.{profile.coachingStyle !== "balanced" ? " Classic-physique exercise priorities are applied to the split you select." : ""}</Text></View>
    <Pressable style={styles.finish} onPress={onApply}><Text style={styles.finishText}>GENERATE MY PROGRAM</Text><Text style={styles.finishArrow}>→</Text></Pressable>
    <Text style={styles.builderLabel}>SIX-WEEK ROUTINE</Text>
    <View style={styles.routineCard}>
      <View style={styles.routineHeader}><Text style={styles.routineTitle}>WEEK {currentRoutineWeek} OF 6</Text><Text style={styles.routineBadge}>{routineChangeDeferred ? "READY" : "ACTIVE"}</Text></View>
      <Text style={styles.routineText}>{routineChangeDeferred ? "You kept your current routine. Refresh it whenever you are ready." : "After six weeks, GymJournal will offer a refreshed routine that keeps your compound exercises and rotates isolation work."}</Text>
      <Pressable onPress={onRotateRoutine} style={styles.routineAction}><Text style={styles.routineActionText}>REFRESH ROUTINE</Text></Pressable>
    </View>
    <Text style={styles.builderLabel}>TEMPORARY TRAINING PLAN</Text>
    <View style={styles.temporaryCard}>
      <Text style={styles.backupTitle}>{currentPlan ? currentPlan.name : "Travel or short-term training"}</Text>
      <Text style={styles.backupText}>{currentPlan ? `${currentPlan.status === "draft" ? "Draft" : "Active"} · ${currentPlan.workouts.length} days · ${trainingSplitLabel(currentPlan.trainingSplit ?? "auto")} · ${currentPlan.startsAt} to ${currentPlan.endsAt}` : "Build a separate three-day plan, select its split, edit every workout before applying it, and automatically return to your regular routine afterward."}</Text>
      <View style={styles.dateRow}><View style={styles.dateField}><Text style={styles.dateLabel}>START (YYYY-MM-DD)</Text><TextInput value={temporaryStart} onChangeText={setTemporaryStart} autoCapitalize="none" keyboardType="numbers-and-punctuation" style={styles.dateInput} /></View><View style={styles.dateField}><Text style={styles.dateLabel}>END (YYYY-MM-DD)</Text><TextInput value={temporaryEnd} onChangeText={setTemporaryEnd} autoCapitalize="none" keyboardType="numbers-and-punctuation" style={styles.dateInput} /></View></View>
      {!currentPlan && <><Text style={styles.dateLabel}>TEMPORARY PLAN SPLIT</Text><View style={styles.splitChips}>{TRAINING_SPLIT_OPTIONS.map((split) => <Pressable key={split.value} onPress={() => setTemporarySplit(split.value)} style={[styles.splitChip, temporarySplit === split.value && styles.splitChipActive]}><Text style={[styles.splitChipText, temporarySplit === split.value && styles.splitChipTextActive]}>{split.value === "auto" ? `RECOMMENDED: ${trainingSplitLabel(resolvedTemporarySplit).toUpperCase()}` : split.label.toUpperCase()}</Text></Pressable>)}</View></>}
      {!currentPlan ? <Pressable onPress={() => onCreateTemporary(temporaryStart, temporaryEnd, temporarySplit)} style={styles.backupPrimary}><Text style={styles.backupPrimaryText}>CREATE {trainingSplitLabel(resolvedTemporarySplit).toUpperCase()} DRAFT</Text></Pressable> : <>
        <View style={styles.backupActions}><Pressable onPress={() => onEditTemporary(currentPlan.id)} style={styles.backupSecondary}><Text style={styles.backupSecondaryText}>EDIT WORKOUTS</Text></Pressable>{currentPlan.status === "draft" ? <Pressable onPress={() => onActivateTemporary(currentPlan.id, temporaryStart, temporaryEnd)} style={styles.backupPrimary}><Text style={styles.backupPrimaryText}>ACTIVATE PLAN</Text></Pressable> : <Pressable onPress={() => onEndTemporary(currentPlan.id)} style={styles.dangerButton}><Text style={styles.dangerText}>END EARLY</Text></Pressable>}</View>
        {currentPlan.status === "draft" && <Pressable onPress={() => onDiscardTemporary(currentPlan.id)} style={styles.dangerButton}><Text style={styles.dangerText}>DISCARD DRAFT</Text></Pressable>}
        <Pressable onPress={() => onMakeTemporaryRegular(currentPlan.id)} style={styles.regularButton}><Text style={styles.regularText}>MAKE THIS MY REGULAR PLAN</Text></Pressable>
        <Text style={styles.protectionText}>Your permanent {trainingDays}-day routine remains unchanged.</Text>
      </>}
    </View>
    {pastPlans.length > 0 && <><Text style={styles.builderLabel}>PAST TEMPORARY PLANS</Text>{pastPlans.slice(0, 5).map((plan) => <View key={plan.id} style={styles.pastPlan}><View style={styles.pastPlanCopy}><Text style={styles.pastPlanName}>{plan.name}</Text><Text style={styles.pastPlanMeta}>{plan.startsAt} → {plan.endsAt} · {plan.workouts.length} days</Text></View><Pressable onPress={() => onReuseTemporary(plan.id, temporaryStart, temporaryEnd)} style={styles.reuseButton}><Text style={styles.reuseText}>REUSE</Text></Pressable></View>)}</>}
    <Text style={styles.builderLabel}>DATA & BACKUP</Text>
    <View style={styles.backupCard}>
      <Text style={styles.backupTitle}>Keep your progress safe</Text>
      <Text style={styles.backupText}>Save a complete offline backup of your workouts, history, coaching settings, and any active session. Restore it later on this or another iPhone.</Text>
      <View style={styles.backupActions}>
        <Pressable disabled={backupBusy} onPress={onExportBackup} style={({ pressed }) => [styles.backupPrimary, (pressed || backupBusy) && styles.buttonMuted]}><Text style={styles.backupPrimaryText}>{backupBusy ? "PLEASE WAIT…" : "SAVE BACKUP"}</Text></Pressable>
        <Pressable disabled={backupBusy} onPress={onImportBackup} style={({ pressed }) => [styles.backupSecondary, (pressed || backupBusy) && styles.buttonMuted]}><Text style={styles.backupSecondaryText}>RESTORE BACKUP</Text></Pressable>
      </View>
    </View>
  </>;
}

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Radio({ active }: { active: boolean }) {
  return <View style={[styles.radio, active && styles.radioActive]}>{active && <View style={styles.radioDot} />}</View>;
}

const styles = StyleSheet.create({
  kicker: { color: "#8d958c", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 30 }, title: { color: "#f8faf5", fontSize: 34, fontWeight: "800", marginTop: 4 },
  builderLabel: { color: "#929a90", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginTop: 27, marginBottom: 10 },
  option: { backgroundColor: "#1a1f1a", borderWidth: 1, borderColor: "#1a1f1a", borderRadius: 9, padding: 15, marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, optionActive: { borderColor: "#d8ff38" }, optionCopy: { flex: 1, paddingRight: 12 }, optionName: { color: "#eff2ed", fontSize: 13, fontWeight: "900", letterSpacing: .8 }, optionNameActive: { color: "#d8ff38" }, optionText: { color: "#899188", fontSize: 11, lineHeight: 16, marginTop: 5 },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: "#71806d", justifyContent: "center", alignItems: "center" }, radioActive: { borderColor: "#d8ff38" }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#d8ff38" },
  choiceRow: { flexDirection: "row", gap: 8 }, splitList: { gap: 8 }, splitChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, splitChip: { borderRadius: 14, borderWidth: 1, borderColor: "#465044", paddingHorizontal: 9, paddingVertical: 7 }, splitChipActive: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, splitChipText: { color: "#aab2a8", fontSize: 7, fontWeight: "900", letterSpacing: .35 }, splitChipTextActive: { color: "#15200e" }, smallChoice: { flex: 1, backgroundColor: "#1a1f1a", borderRadius: 8, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: "#303730" }, smallChoiceActive: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, smallChoiceText: { color: "#aab2a8", fontSize: 8, fontWeight: "900" }, smallChoiceTextActive: { color: "#15200e" },
  dayChoice: { flex: 1, backgroundColor: "#1a1f1a", borderRadius: 8, paddingVertical: 14, alignItems: "center" }, dayChoiceActive: { backgroundColor: "#d8ff38" }, dayChoiceText: { color: "#e8ece6", fontSize: 22, fontWeight: "900" }, dayChoiceTextActive: { color: "#15200e" }, dayChoiceCaption: { color: "#899188", fontSize: 8, fontWeight: "900", letterSpacing: .8, marginTop: 2 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { backgroundColor: "#1a1f1a", borderRadius: 15, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: "#303730" }, chipActive: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, chipText: { color: "#9da59b", fontSize: 8, fontWeight: "900" }, chipTextActive: { color: "#15200e" },
  preview: { backgroundColor: "#1a1f1a", borderLeftWidth: 3, borderLeftColor: "#d8ff38", borderRadius: 7, padding: 14, marginTop: 20 }, previewTitle: { color: "#f3f5f0", fontSize: 15, fontWeight: "800", textTransform: "capitalize" }, previewText: { color: "#8c958a", fontSize: 11, lineHeight: 16, marginTop: 5 },
  finish: { height: 58, borderRadius: 9, backgroundColor: "#d8ff38", marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }, finishText: { color: "#15190f", fontWeight: "900", fontSize: 12, letterSpacing: .8 }, finishArrow: { color: "#15190f", fontSize: 22, fontWeight: "700" },
  routineCard: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 16, borderWidth: 1, borderColor: "#303730" }, routineHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, routineTitle: { color: "#f3f5f0", fontSize: 15, fontWeight: "900" }, routineBadge: { color: "#d8ff38", fontSize: 8, fontWeight: "900", letterSpacing: 1, borderWidth: 1, borderColor: "#66762c", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }, routineText: { color: "#8c958a", fontSize: 11, lineHeight: 17, marginTop: 8 }, routineAction: { minHeight: 44, borderRadius: 7, borderWidth: 1, borderColor: "#d8ff38", alignItems: "center", justifyContent: "center", marginTop: 15 }, routineActionText: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .7 },
  temporaryCard: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 16, borderWidth: 1, borderColor: "#52621f", gap: 12 }, dateRow: { flexDirection: "row", gap: 8 }, dateField: { flex: 1 }, dateLabel: { color: "#8d958c", fontSize: 7, fontWeight: "900", letterSpacing: .6, marginBottom: 5 }, dateInput: { minHeight: 42, borderWidth: 1, borderColor: "#465044", borderRadius: 7, color: "#f3f5f0", paddingHorizontal: 9, fontSize: 12, fontWeight: "700" }, dangerButton: { flex: 1, minHeight: 44, borderRadius: 7, borderWidth: 1, borderColor: "#8b4a42", alignItems: "center", justifyContent: "center" }, dangerText: { color: "#e89b8e", fontSize: 9, fontWeight: "900", letterSpacing: .5 }, regularButton: { minHeight: 40, borderRadius: 7, borderWidth: 1, borderColor: "#65705f", alignItems: "center", justifyContent: "center" }, regularText: { color: "#bfc8ba", fontSize: 8, fontWeight: "900", letterSpacing: .6 }, protectionText: { color: "#a7b56b", fontSize: 9, lineHeight: 14 }, pastPlan: { backgroundColor: "#1a1f1a", borderRadius: 8, borderWidth: 1, borderColor: "#303730", padding: 13, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }, pastPlanCopy: { flex: 1 }, pastPlanName: { color: "#edf0ea", fontSize: 12, fontWeight: "800" }, pastPlanMeta: { color: "#899188", fontSize: 9, marginTop: 4 }, reuseButton: { borderWidth: 1, borderColor: "#d8ff38", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9 }, reuseText: { color: "#d8ff38", fontSize: 8, fontWeight: "900", letterSpacing: .6 },
  backupCard: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 16, borderWidth: 1, borderColor: "#303730" }, backupTitle: { color: "#f3f5f0", fontSize: 15, fontWeight: "800" }, backupText: { color: "#8c958a", fontSize: 11, lineHeight: 17, marginTop: 6 }, backupActions: { flexDirection: "row", gap: 8, marginTop: 15 }, backupPrimary: { flex: 1, minHeight: 44, borderRadius: 7, backgroundColor: "#d8ff38", alignItems: "center", justifyContent: "center" }, backupPrimaryText: { color: "#15190f", fontSize: 9, fontWeight: "900", letterSpacing: .6 }, backupSecondary: { flex: 1, minHeight: 44, borderRadius: 7, borderWidth: 1, borderColor: "#626b60", alignItems: "center", justifyContent: "center" }, backupSecondaryText: { color: "#e9ede6", fontSize: 9, fontWeight: "900", letterSpacing: .5 }, buttonMuted: { opacity: .55 },
  settingCard: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 14, gap: 9 }, settingName: { color: "#8d958c", fontSize: 8, fontWeight: "900", letterSpacing: .8, marginTop: 4 },
});
