import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AnalyticsRange, calculateAnalytics, exerciseProgress, personalRecords, recordsInRange } from "../domain/analytics";
import { displayExerciseWeight, displayWeight, exerciseWeightLabel, SessionRecord, WeightUnit, weightUnitLabel } from "../domain/training";

type Section = "overview" | "progress" | "records";

export function AnalyticsScreen({ records, trainingDays, weightUnit }: { records: SessionRecord[]; trainingDays: number; weightUnit: WeightUnit }) {
  const [section, setSection] = useState<Section>("overview");
  const [range, setRange] = useState<AnalyticsRange>(7);
  const exerciseOptions = useMemo(() => {
    const options = new Map<string, string>();
    records.forEach((record) => record.exercises.forEach((exercise) => options.set(exercise.id, exercise.name)));
    return [...options.entries()];
  }, [records]);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const selectedExerciseId = exerciseId && exerciseOptions.some(([id]) => id === exerciseId) ? exerciseId : exerciseOptions[0]?.[0];
  const analytics = calculateAnalytics(records, range, trainingDays);
  const filtered = recordsInRange(records, range);
  const progress = selectedExerciseId ? exerciseProgress(records, selectedExerciseId, range) : [];
  const prs = personalRecords(filtered);

  return <>
    <Text style={styles.kicker}>TRAINING INTELLIGENCE</Text><Text style={styles.title}>Analytics</Text>
    <View style={styles.tabs}>{(["overview", "progress", "records"] as Section[]).map((item) => <Pressable key={item} onPress={() => setSection(item)} style={[styles.tab, section === item && styles.tabActive]}><Text style={[styles.tabText, section === item && styles.tabTextActive]}>{item.toUpperCase()}</Text></Pressable>)}</View>
    <View style={styles.ranges}>{([7, 30, "all"] as AnalyticsRange[]).map((item) => <Pressable key={String(item)} onPress={() => setRange(item)} style={[styles.range, range === item && styles.rangeActive]}><Text style={[styles.rangeText, range === item && styles.rangeTextActive]}>{item === "all" ? "ALL TIME" : `${item} DAYS`}</Text></Pressable>)}</View>
    {section === "overview" ? <Overview analytics={analytics} weightUnit={weightUnit} /> : section === "progress" ? <Progress options={exerciseOptions} selectedId={selectedExerciseId} onSelect={setExerciseId} points={progress} weightUnit={weightUnit} /> : <Records records={prs} weightUnit={weightUnit} />}
  </>;
}

function Overview({ analytics, weightUnit }: { analytics: ReturnType<typeof calculateAnalytics>; weightUnit: WeightUnit }) {
  return <><View style={styles.coach}><Text style={styles.coachLabel}>COACH INSIGHT</Text><Text style={styles.coachText}>{analytics.coachSummary}</Text></View><View style={styles.grid}>
    <Metric value={String(analytics.sessions)} label="WORKOUTS" /><Metric value={String(analytics.sets)} label="SETS" />
    <Metric value={String(analytics.workingSets)} label="WORKING SETS" /><Metric value={`${analytics.consistencyPercent}%`} label="CONSISTENCY" />
    <Metric value={displayWeight(analytics.workingVolume, weightUnit).toLocaleString()} label={`WORK ${weightUnitLabel(weightUnit).toUpperCase()}·REP`} /><Metric value={displayWeight(analytics.warmupVolume, weightUnit).toLocaleString()} label={`WARM-UP ${weightUnitLabel(weightUnit).toUpperCase()}·REP`} />
  </View>{analytics.volumeChangePercent !== undefined && <Text style={styles.change}>Working volume is {Math.abs(analytics.volumeChangePercent)}% {analytics.volumeChangePercent >= 0 ? "higher" : "lower"} than the previous period.</Text>}</>;
}

function Metric({ value, label }: { value: string; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function Progress({ options, selectedId, onSelect, points, weightUnit }: { options: [string, string][]; selectedId?: string; onSelect: (id: string) => void; points: ReturnType<typeof exerciseProgress>; weightUnit: WeightUnit }) {
  if (!options.length) return <Empty text="Complete a workout to unlock exercise trends." />;
  return <><Text style={styles.sectionLabel}>SELECT EXERCISE</Text><View style={styles.exerciseList}>{options.map(([id, name]) => <Pressable key={id} onPress={() => onSelect(id)} style={[styles.exerciseChip, selectedId === id && styles.exerciseChipActive]}><Text style={[styles.exerciseChipText, selectedId === id && styles.exerciseChipTextActive]}>{name}</Text></Pressable>)}</View><Text style={styles.sectionLabel}>WORKING-SET TREND</Text>{points.length < 2 && <Text style={styles.hint}>Baseline established. Complete this exercise again to unlock a comparison.</Text>}{points.map((point) => <View key={point.recordId} style={styles.point}><View><Text style={styles.pointDate}>{new Date(point.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</Text><Text style={styles.pointDetail}>{displayExerciseWeight(point.weight, point, weightUnit)} {exerciseWeightLabel(point, weightUnit)} × {point.reps} reps</Text></View><Text style={styles.pointVolume}>{displayWeight(point.volume, weightUnit).toLocaleString()} {weightUnitLabel(weightUnit)}</Text></View>)}</>;
}

function Records({ records, weightUnit }: { records: ReturnType<typeof personalRecords>; weightUnit: WeightUnit }) {
  if (!records.length) return <Empty text="Complete a workout to establish personal records." />;
  return <><Text style={styles.sectionLabel}>WORKING-SET BESTS</Text>{records.map((record) => <View key={record.exerciseId} style={styles.record}><Text style={styles.recordName}>{record.exerciseName}</Text><View style={styles.recordStats}><Text style={styles.recordValue}>{displayExerciseWeight(record.maxWeight, record, weightUnit)} {exerciseWeightLabel(record, weightUnit)}<Text style={styles.recordLabel}> MAX</Text></Text><Text style={styles.recordValue}>{record.maxReps}<Text style={styles.recordLabel}> REPS</Text></Text><Text style={styles.recordValue}>{displayWeight(record.bestSetVolume, weightUnit).toLocaleString()}<Text style={styles.recordLabel}> {weightUnitLabel(weightUnit).toUpperCase()}·REP</Text></Text></View></View>)}</>;
}

function Empty({ text }: { text: string }) { return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>; }

const styles = StyleSheet.create({
  kicker: { color: "#8d958c", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 26 }, title: { color: "#f8faf5", fontSize: 34, fontWeight: "800", marginTop: 4 },
  tabs: { flexDirection: "row", gap: 6, marginTop: 18 }, tab: { flex: 1, height: 38, backgroundColor: "#1a1f1a", borderRadius: 6, alignItems: "center", justifyContent: "center" }, tabActive: { backgroundColor: "#d8ff38" }, tabText: { color: "#818a7f", fontSize: 8, fontWeight: "900" }, tabTextActive: { color: "#15190f" },
  ranges: { flexDirection: "row", gap: 7, marginTop: 9 }, range: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 5, borderColor: "#3c443b", borderWidth: 1 }, rangeActive: { borderColor: "#8fa92b" }, rangeText: { color: "#778075", fontSize: 8, fontWeight: "900" }, rangeTextActive: { color: "#d8ff38" },
  coach: { backgroundColor: "#202a1d", borderColor: "#586d35", borderWidth: 1, borderRadius: 9, padding: 15, marginTop: 16 }, coachLabel: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .9 }, coachText: { color: "#e4e9e0", fontSize: 13, lineHeight: 19, marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }, metric: { width: "48.5%", backgroundColor: "#1a1f1a", borderRadius: 8, padding: 15 }, metricValue: { color: "#f4f7ef", fontSize: 23, fontWeight: "900" }, metricLabel: { color: "#7f887d", fontSize: 8, fontWeight: "900", marginTop: 4 }, change: { color: "#aeb6ac", fontSize: 11, marginTop: 12 },
  sectionLabel: { color: "#858e83", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 19, marginBottom: 7 }, exerciseList: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, exerciseChip: { borderColor: "#3e473d", borderWidth: 1, borderRadius: 5, paddingHorizontal: 9, paddingVertical: 7 }, exerciseChipActive: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, exerciseChipText: { color: "#adb5aa", fontSize: 8, fontWeight: "800" }, exerciseChipTextActive: { color: "#15190f" }, hint: { color: "#9ca59a", fontSize: 11, lineHeight: 16, marginBottom: 7 },
  point: { backgroundColor: "#1a1f1a", borderRadius: 7, padding: 13, marginTop: 7, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, pointDate: { color: "#858e83", fontSize: 9 }, pointDetail: { color: "#eef2eb", fontSize: 13, fontWeight: "800", marginTop: 3 }, pointVolume: { color: "#d8ff38", fontSize: 12, fontWeight: "900" },
  record: { backgroundColor: "#1a1f1a", borderRadius: 8, padding: 13, marginTop: 7 }, recordName: { color: "#f0f3ed", fontSize: 13, fontWeight: "800" }, recordStats: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 }, recordValue: { color: "#d8ff38", fontSize: 12, fontWeight: "900" }, recordLabel: { color: "#7f887d", fontSize: 7 }, empty: { backgroundColor: "#1a1f1a", borderRadius: 8, padding: 20, marginTop: 16 }, emptyText: { color: "#9da69a", fontSize: 12, lineHeight: 18, textAlign: "center" },
});
