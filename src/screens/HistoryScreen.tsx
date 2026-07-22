import { StyleSheet, Text, View } from "react-native";
import { Exercise, progression, SessionRecord } from "../domain/training";

export function HistoryScreen({ records }: { records: SessionRecord[] }) {
  const latestExercises = new Map<string, Exercise>();
  records.forEach((record) => record.exercises.forEach((exercise) => { if (!latestExercises.has(exercise.id)) latestExercises.set(exercise.id, exercise); }));
  return <><Text style={styles.kicker}>SESSION ARCHIVE</Text><Text style={styles.title}>History</Text>
    {records.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No workouts saved yet</Text><Text style={styles.emptyText}>Finish a workout and it will appear here with its loads, reps, and volume.</Text></View> : <>
      <View style={styles.historyStat}><Text style={styles.historyNumber}>{records.length}</Text><Text style={styles.historyLabel}>WORKOUTS COMPLETED</Text><Text style={styles.historyVolume}>{records.reduce((sum, record) => sum + record.volume, 0).toLocaleString()} kg total volume</Text></View>
      <Text style={styles.sectionLabel}>RECENT SESSIONS</Text>{records.map((record) => <View key={record.id} style={styles.historyCard}><View><Text style={styles.historyTitle}>{record.workoutTitle.split(" · ").pop()}</Text><Text style={styles.historyDate}>{new Date(record.completedAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {record.exercises.filter((exercise) => exercise.sets.some((set) => set.completed)).length} exercises</Text></View><Text style={styles.cardVolume}>{record.volume.toLocaleString()}<Text style={styles.cardUnit}> kg</Text></Text></View>)}</>}
    {latestExercises.size > 0 && <><Text style={styles.sectionLabel}>LATEST PERFORMANCE</Text>{Array.from(latestExercises.values()).map((exercise) => <View key={exercise.id} style={styles.performanceCard}><Text style={styles.performanceName}>{exercise.name}</Text><Text style={styles.performanceValue}>{exercise.lastWeight} kg × {exercise.lastReps}</Text><Text style={styles.performanceTip}>{progression(exercise)}</Text></View>)}</>}
  </>;
}

const styles = StyleSheet.create({
  kicker: { color: "#8d958c", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 30 }, title: { color: "#f8faf5", fontSize: 34, fontWeight: "800", marginTop: 4 },
  empty: { backgroundColor: "#1a1f1a", borderRadius: 10, padding: 22, marginTop: 20 }, emptyTitle: { color: "#f4f6f1", fontSize: 17, fontWeight: "800" }, emptyText: { color: "#8d958b", fontSize: 12, lineHeight: 18, marginTop: 8 },
  historyStat: { backgroundColor: "#1a1f1a", borderRadius: 10, marginTop: 18, padding: 18 }, historyNumber: { color: "#d8ff38", fontSize: 34, fontWeight: "900" }, historyLabel: { color: "#7d857c", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 3 }, historyVolume: { color: "#dce1db", fontSize: 13, fontWeight: "700", marginTop: 14 },
  sectionLabel: { color: "#90988e", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginTop: 26, marginBottom: 8 },
  historyCard: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 15, marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, historyTitle: { color: "#eff2ed", fontSize: 15, fontWeight: "800" }, historyDate: { color: "#858d83", fontSize: 11, marginTop: 5 }, cardVolume: { color: "#d8ff38", fontSize: 17, fontWeight: "900" }, cardUnit: { color: "#9da59b", fontSize: 10 },
  performanceCard: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 15, marginTop: 8 }, performanceName: { color: "#f0f3ef", fontSize: 15, fontWeight: "800" }, performanceValue: { color: "#d8ff38", fontSize: 13, fontWeight: "800", marginTop: 5 }, performanceTip: { color: "#858d83", fontSize: 10, lineHeight: 14, marginTop: 8 },
});
