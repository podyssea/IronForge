import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CoachingRecommendation } from "../domain/coaching";

type CoachPanelProps = {
  recommendations: CoachingRecommendation[];
  onApply: (recommendation: CoachingRecommendation, weight: number) => void;
  onReject: (recommendation: CoachingRecommendation) => void;
};

export function CoachPanel({ recommendations, onApply, onReject }: CoachPanelProps) {
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    setWeights(Object.fromEntries(recommendations.map((item) => [item.id, item.suggestedWeight])));
  }, [recommendations.map((item) => item.id).join("|")]);

  if (!recommendations.length) return null;
  return <View style={styles.panel}>
    <Text style={styles.eyebrow}>PERSONAL COACH</Text>
    <Text style={styles.title}>Review today’s adjustments</Text>
    <Text style={styles.intro}>Built from your completed workouts. You stay in control of every load.</Text>
    {recommendations.map((item) => {
      const weight = weights[item.id] ?? item.suggestedWeight;
      return <View key={item.id} style={styles.card}>
        <View style={styles.row}><Text style={styles.name}>{item.exerciseName}</Text><Text style={[styles.badge, item.action === "increase" ? styles.increase : item.action === "reduce" ? styles.reduce : styles.hold]}>{item.action.toUpperCase()}</Text></View>
        <Text style={styles.reason}>{item.reason}</Text>
        <View style={styles.loadRow}><Text style={styles.current}>{item.currentWeight} kg →</Text><Pressable accessibilityLabel={`Decrease ${item.exerciseName} recommendation`} onPress={() => setWeights((current) => ({ ...current, [item.id]: Math.max(0, weight - .5) }))} style={styles.step}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.weight}>{weight} kg</Text><Pressable accessibilityLabel={`Increase ${item.exerciseName} recommendation`} onPress={() => setWeights((current) => ({ ...current, [item.id]: weight + .5 }))} style={styles.step}><Text style={styles.stepText}>+</Text></Pressable></View>
        <View style={styles.actions}><Pressable onPress={() => onReject(item)} style={styles.reject}><Text style={styles.rejectText}>KEEP CURRENT</Text></Pressable><Pressable onPress={() => onApply(item, weight)} style={styles.apply}><Text style={styles.applyText}>{weight === item.suggestedWeight ? "APPLY" : "APPLY CUSTOM"}</Text></Pressable></View>
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#202a1d", borderColor: "#586d35", borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 16 },
  eyebrow: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, title: { color: "#f4f7ef", fontSize: 18, fontWeight: "900", marginTop: 4 }, intro: { color: "#aab3a7", fontSize: 10, lineHeight: 15, marginTop: 5 },
  card: { borderTopColor: "#405039", borderTopWidth: 1, paddingTop: 12, marginTop: 12 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, name: { color: "#eef2ea", fontSize: 13, fontWeight: "800", flex: 1 }, badge: { fontSize: 8, fontWeight: "900", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 4, overflow: "hidden" }, increase: { color: "#15200e", backgroundColor: "#d8ff38" }, hold: { color: "#dce1db", backgroundColor: "#4a5348" }, reduce: { color: "#ffd6cf", backgroundColor: "#673931" },
  reason: { color: "#aeb7ab", fontSize: 10, lineHeight: 15, marginTop: 6 }, loadRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 }, current: { color: "#7f897c", fontSize: 11 }, step: { width: 29, height: 29, borderRadius: 5, borderColor: "#667361", borderWidth: 1, alignItems: "center", justifyContent: "center" }, stepText: { color: "#e7ece3", fontSize: 18, fontWeight: "800" }, weight: { color: "#f4f7ef", fontSize: 14, fontWeight: "900", minWidth: 55, textAlign: "center" },
  actions: { flexDirection: "row", gap: 8, marginTop: 11 }, reject: { flex: 1, height: 34, borderColor: "#667361", borderWidth: 1, borderRadius: 5, alignItems: "center", justifyContent: "center" }, rejectText: { color: "#b7c0b4", fontSize: 8, fontWeight: "900" }, apply: { flex: 1, height: 34, backgroundColor: "#d8ff38", borderRadius: 5, alignItems: "center", justifyContent: "center" }, applyText: { color: "#15200e", fontSize: 8, fontWeight: "900" },
});
