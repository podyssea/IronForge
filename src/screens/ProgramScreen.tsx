import { Pressable, StyleSheet, Text, View } from "react-native";
import { TrainingPhase } from "../domain/training";

type ProgramScreenProps = {
  trainingDays: number;
  phase: TrainingPhase;
  onDays: (days: number) => void;
  onPhase: (phase: TrainingPhase) => void;
  onApply: () => void;
};

export function ProgramScreen({ trainingDays, phase, onDays, onPhase, onApply }: ProgramScreenProps) {
  const phaseInfo: Record<TrainingPhase, string> = { strength: "Lower reps and focused working sets.", hypertrophy: "Moderate-to-high reps for muscle-building volume.", deload: "Half volume with loads reduced by 15%." };
  return <><Text style={styles.kicker}>ADAPTIVE PROGRAM</Text><Text style={styles.title}>Build your split</Text>
    <Text style={styles.builderLabel}>TRAINING DAYS</Text><View style={styles.choiceRow}>{[2, 3, 4, 5].map((days) => <Pressable key={days} onPress={() => onDays(days)} style={[styles.dayChoice, trainingDays === days && styles.dayChoiceActive]}><Text style={[styles.dayChoiceText, trainingDays === days && styles.dayChoiceTextActive]}>{days}</Text><Text style={[styles.dayChoiceCaption, trainingDays === days && styles.dayChoiceTextActive]}>DAYS</Text></Pressable>)}</View>
    <View style={styles.preview}><Text style={styles.previewTitle}>{trainingDays === 2 ? "Full body A / B" : trainingDays === 3 ? "Upper / Lower / Upper" : trainingDays === 4 ? "Upper / Lower split" : "Upper / Lower + pump"}</Text><Text style={styles.previewText}>Built automatically from your current exercise selection. Working loads carry forward.</Text></View>
    <Text style={styles.builderLabel}>CURRENT PHASE</Text>{(["strength", "hypertrophy", "deload"] as TrainingPhase[]).map((item) => <Pressable key={item} onPress={() => onPhase(item)} style={[styles.phaseChoice, phase === item && styles.phaseChoiceActive]}><View><Text style={[styles.phaseName, phase === item && styles.phaseNameActive]}>{item.toUpperCase()}</Text><Text style={styles.phaseText}>{phaseInfo[item]}</Text></View><View style={[styles.radio, phase === item && styles.radioActive]}>{phase === item && <View style={styles.radioDot} />}</View></Pressable>)}
    <Pressable style={styles.finish} onPress={onApply}><Text style={styles.finishText}>APPLY PROGRAM</Text><Text style={styles.finishArrow}>→</Text></Pressable>
  </>;
}

const styles = StyleSheet.create({
  kicker: { color: "#8d958c", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 30 }, title: { color: "#f8faf5", fontSize: 34, fontWeight: "800", marginTop: 4 },
  builderLabel: { color: "#929a90", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginTop: 27, marginBottom: 10 }, choiceRow: { flexDirection: "row", gap: 8 },
  dayChoice: { flex: 1, backgroundColor: "#1a1f1a", borderRadius: 8, paddingVertical: 14, alignItems: "center" }, dayChoiceActive: { backgroundColor: "#d8ff38" }, dayChoiceText: { color: "#e8ece6", fontSize: 22, fontWeight: "900" }, dayChoiceTextActive: { color: "#15200e" }, dayChoiceCaption: { color: "#899188", fontSize: 8, fontWeight: "900", letterSpacing: .8, marginTop: 2 },
  preview: { backgroundColor: "#1a1f1a", borderLeftWidth: 3, borderLeftColor: "#d8ff38", borderRadius: 7, padding: 14, marginTop: 15 }, previewTitle: { color: "#f3f5f0", fontSize: 15, fontWeight: "800" }, previewText: { color: "#8c958a", fontSize: 11, lineHeight: 16, marginTop: 5 },
  phaseChoice: { backgroundColor: "#1a1f1a", borderWidth: 1, borderColor: "#1a1f1a", borderRadius: 9, padding: 15, marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, phaseChoiceActive: { borderColor: "#d8ff38" }, phaseName: { color: "#eff2ed", fontSize: 13, fontWeight: "900", letterSpacing: .8 }, phaseNameActive: { color: "#d8ff38" }, phaseText: { color: "#899188", fontSize: 11, marginTop: 5 },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: "#71806d", justifyContent: "center", alignItems: "center" }, radioActive: { borderColor: "#d8ff38" }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#d8ff38" },
  finish: { height: 58, borderRadius: 9, backgroundColor: "#d8ff38", marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }, finishText: { color: "#15190f", fontWeight: "900", fontSize: 13, letterSpacing: 1 }, finishArrow: { color: "#15190f", fontSize: 22, fontWeight: "700" },
});
