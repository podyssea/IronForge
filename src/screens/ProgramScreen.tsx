import { Pressable, StyleSheet, Text, View } from "react-native";
import { CoachingProfile } from "../domain/coaching";
import { Equipment, ExperienceLevel, TrainingStyle } from "../domain/exerciseLibrary";
import { AppSettings } from "../storage/migrations";

const GOALS: { value: TrainingStyle; label: string; detail: string }[] = [
  { value: "strength", label: "Strength", detail: "Heavier compounds and lower reps" },
  { value: "hypertrophy", label: "Hypertrophy", detail: "Muscle-building volume and moderate reps" },
  { value: "general-fitness", label: "General fitness", detail: "Balanced strength, muscle and movement" },
  { value: "muscular-endurance", label: "Endurance", detail: "Higher reps and shorter sessions" },
];
const EXPERIENCE: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "cable", "machine", "smith-machine", "bodyweight", "resistance-band", "kettlebell"];

type ProgramScreenProps = {
  trainingDays: number;
  profile: CoachingProfile;
  settings: AppSettings;
  backupBusy: boolean;
  onDays: (days: number) => void;
  onProfile: (profile: CoachingProfile) => void;
  onSettings: (settings: AppSettings) => void;
  onApply: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
};

export function ProgramScreen({ trainingDays, profile, settings, backupBusy, onDays, onProfile, onSettings, onApply, onExportBackup, onImportBackup }: ProgramScreenProps) {
  const update = (changes: Partial<CoachingProfile>) => onProfile({ ...profile, ...changes });
  const toggleEquipment = (item: Equipment) => {
    const selected = profile.availableEquipment.includes(item);
    if (selected && profile.availableEquipment.length === 1) return;
    update({ availableEquipment: selected ? profile.availableEquipment.filter((option) => option !== item) : [...profile.availableEquipment, item] });
  };
  const estimatedExercises = Math.max(4, Math.min(9, Math.floor((profile.sessionMinutes - 8) / 7)));

  return <><Text style={styles.kicker}>PERSONAL COACH</Text><Text style={styles.title}>Build your program</Text>
    <Text style={styles.builderLabel}>PRIMARY GOAL</Text>{GOALS.map((goal) => <Pressable key={goal.value} onPress={() => update({ goal: goal.value })} style={[styles.option, profile.goal === goal.value && styles.optionActive]}><View><Text style={[styles.optionName, profile.goal === goal.value && styles.optionNameActive]}>{goal.label.toUpperCase()}</Text><Text style={styles.optionText}>{goal.detail}</Text></View><Radio active={profile.goal === goal.value} /></Pressable>)}
    <Text style={styles.builderLabel}>EXPERIENCE</Text><View style={styles.choiceRow}>{EXPERIENCE.map((item) => <Pressable key={item} onPress={() => update({ experience: item })} style={[styles.smallChoice, profile.experience === item && styles.smallChoiceActive]}><Text style={[styles.smallChoiceText, profile.experience === item && styles.smallChoiceTextActive]}>{item.toUpperCase()}</Text></Pressable>)}</View>
    <Text style={styles.builderLabel}>TRAINING DAYS</Text><View style={styles.choiceRow}>{[2, 3, 4, 5].map((days) => <Pressable key={days} onPress={() => onDays(days)} style={[styles.dayChoice, trainingDays === days && styles.dayChoiceActive]}><Text style={[styles.dayChoiceText, trainingDays === days && styles.dayChoiceTextActive]}>{days}</Text><Text style={[styles.dayChoiceCaption, trainingDays === days && styles.dayChoiceTextActive]}>DAYS</Text></Pressable>)}</View>
    <Text style={styles.builderLabel}>SESSION LENGTH</Text><View style={styles.wrap}>{[30, 45, 60, 75, 90].map((minutes) => <Pressable key={minutes} onPress={() => update({ sessionMinutes: minutes })} style={[styles.chip, profile.sessionMinutes === minutes && styles.chipActive]}><Text style={[styles.chipText, profile.sessionMinutes === minutes && styles.chipTextActive]}>{minutes} MIN</Text></Pressable>)}</View>
    <Text style={styles.builderLabel}>AVAILABLE EQUIPMENT</Text><View style={styles.wrap}>{EQUIPMENT.map((item) => <Pressable key={item} onPress={() => toggleEquipment(item)} style={[styles.chip, profile.availableEquipment.includes(item) && styles.chipActive]}><Text style={[styles.chipText, profile.availableEquipment.includes(item) && styles.chipTextActive]}>{item.replaceAll("-", " ").toUpperCase()}</Text></Pressable>)}</View>
    <Text style={styles.builderLabel}>TRAINING SETTINGS</Text>
    <View style={styles.settingCard}>
      <Text style={styles.settingName}>WEIGHT UNIT</Text><View style={styles.choiceRow}>{(["kg", "lb"] as const).map((unit) => <Pressable key={unit} onPress={() => onSettings({ ...settings, weightUnit: unit })} style={[styles.smallChoice, settings.weightUnit === unit && styles.smallChoiceActive]}><Text style={[styles.smallChoiceText, settings.weightUnit === unit && styles.smallChoiceTextActive]}>{unit.toUpperCase()}</Text></Pressable>)}</View>
      <Text style={styles.settingName}>WORKING-SET EFFORT</Text><View style={styles.choiceRow}>{(["rir", "rpe"] as const).map((metric) => <Pressable key={metric} onPress={() => onSettings({ ...settings, effortMetric: metric })} style={[styles.smallChoice, settings.effortMetric === metric && styles.smallChoiceActive]}><Text style={[styles.smallChoiceText, settings.effortMetric === metric && styles.smallChoiceTextActive]}>{metric.toUpperCase()}</Text></Pressable>)}</View>
      <Text style={styles.settingName}>DEFAULT REST TIMER</Text><View style={styles.wrap}>{[60, 90, 120, 180].map((seconds) => <Pressable key={seconds} onPress={() => onSettings({ ...settings, defaultRestSeconds: seconds })} style={[styles.chip, settings.defaultRestSeconds === seconds && styles.chipActive]}><Text style={[styles.chipText, settings.defaultRestSeconds === seconds && styles.chipTextActive]}>{seconds < 60 ? `${seconds} SEC` : `${seconds / 60} MIN`}</Text></Pressable>)}</View>
    </View>
    <View style={styles.preview}><Text style={styles.previewTitle}>{trainingDays}-day {profile.goal.replaceAll("-", " ")} plan</Text><Text style={styles.previewText}>Approximately {estimatedExercises} exercises per session for a {profile.sessionMinutes}-minute target. Exercise difficulty is capped at {profile.experience} and restricted to your selected equipment.</Text></View>
    <Pressable style={styles.finish} onPress={onApply}><Text style={styles.finishText}>GENERATE MY PROGRAM</Text><Text style={styles.finishArrow}>→</Text></Pressable>
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

function Radio({ active }: { active: boolean }) {
  return <View style={[styles.radio, active && styles.radioActive]}>{active && <View style={styles.radioDot} />}</View>;
}

const styles = StyleSheet.create({
  kicker: { color: "#8d958c", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 30 }, title: { color: "#f8faf5", fontSize: 34, fontWeight: "800", marginTop: 4 },
  builderLabel: { color: "#929a90", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginTop: 27, marginBottom: 10 },
  option: { backgroundColor: "#1a1f1a", borderWidth: 1, borderColor: "#1a1f1a", borderRadius: 9, padding: 15, marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, optionActive: { borderColor: "#d8ff38" }, optionName: { color: "#eff2ed", fontSize: 13, fontWeight: "900", letterSpacing: .8 }, optionNameActive: { color: "#d8ff38" }, optionText: { color: "#899188", fontSize: 11, marginTop: 5 },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: "#71806d", justifyContent: "center", alignItems: "center" }, radioActive: { borderColor: "#d8ff38" }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#d8ff38" },
  choiceRow: { flexDirection: "row", gap: 8 }, smallChoice: { flex: 1, backgroundColor: "#1a1f1a", borderRadius: 8, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: "#303730" }, smallChoiceActive: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, smallChoiceText: { color: "#aab2a8", fontSize: 8, fontWeight: "900" }, smallChoiceTextActive: { color: "#15200e" },
  dayChoice: { flex: 1, backgroundColor: "#1a1f1a", borderRadius: 8, paddingVertical: 14, alignItems: "center" }, dayChoiceActive: { backgroundColor: "#d8ff38" }, dayChoiceText: { color: "#e8ece6", fontSize: 22, fontWeight: "900" }, dayChoiceTextActive: { color: "#15200e" }, dayChoiceCaption: { color: "#899188", fontSize: 8, fontWeight: "900", letterSpacing: .8, marginTop: 2 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { backgroundColor: "#1a1f1a", borderRadius: 15, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: "#303730" }, chipActive: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, chipText: { color: "#9da59b", fontSize: 8, fontWeight: "900" }, chipTextActive: { color: "#15200e" },
  preview: { backgroundColor: "#1a1f1a", borderLeftWidth: 3, borderLeftColor: "#d8ff38", borderRadius: 7, padding: 14, marginTop: 20 }, previewTitle: { color: "#f3f5f0", fontSize: 15, fontWeight: "800", textTransform: "capitalize" }, previewText: { color: "#8c958a", fontSize: 11, lineHeight: 16, marginTop: 5 },
  finish: { height: 58, borderRadius: 9, backgroundColor: "#d8ff38", marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }, finishText: { color: "#15190f", fontWeight: "900", fontSize: 12, letterSpacing: .8 }, finishArrow: { color: "#15190f", fontSize: 22, fontWeight: "700" },
  backupCard: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 16, borderWidth: 1, borderColor: "#303730" }, backupTitle: { color: "#f3f5f0", fontSize: 15, fontWeight: "800" }, backupText: { color: "#8c958a", fontSize: 11, lineHeight: 17, marginTop: 6 }, backupActions: { flexDirection: "row", gap: 8, marginTop: 15 }, backupPrimary: { flex: 1, minHeight: 44, borderRadius: 7, backgroundColor: "#d8ff38", alignItems: "center", justifyContent: "center" }, backupPrimaryText: { color: "#15190f", fontSize: 9, fontWeight: "900", letterSpacing: .6 }, backupSecondary: { flex: 1, minHeight: 44, borderRadius: 7, borderWidth: 1, borderColor: "#626b60", alignItems: "center", justifyContent: "center" }, backupSecondaryText: { color: "#e9ede6", fontSize: 9, fontWeight: "900", letterSpacing: .5 }, buttonMuted: { opacity: .55 },
  settingCard: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 14, gap: 9 }, settingName: { color: "#8d958c", fontSize: 8, fontWeight: "900", letterSpacing: .8, marginTop: 4 },
});
