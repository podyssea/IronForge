import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { EXERCISE_LIBRARY, ExerciseDefinition, getExerciseDefinition } from "../domain/exerciseLibrary";

type ExerciseLibraryScreenProps = {
  selectionMode?: "replace" | "add";
  replacementForId?: string;
  onSelect?: (exercise: ExerciseDefinition) => void;
  onCancelSelection?: () => void;
  excludedIds?: string[];
  preferredIds?: string[];
  profileExcludedIds?: string[];
  onPreference?: (id: string, preference: "preferred" | "excluded" | "neutral") => void;
};

export function ExerciseLibraryScreen({ selectionMode, replacementForId, onSelect, onCancelSelection, excludedIds = [], preferredIds = [], profileExcludedIds = [], onPreference }: ExerciseLibraryScreenProps) {
  const [search, setSearch] = useState("");
  const source = replacementForId ? getExerciseDefinition(replacementForId) : undefined;
  const results = useMemo(() => EXERCISE_LIBRARY.filter((exercise) => exercise.id !== replacementForId
    && !excludedIds.includes(exercise.id)
    && (!search.trim() || exercise.name.toLowerCase().includes(search.trim().toLowerCase()))), [excludedIds, replacementForId, search]);

  const selecting = selectionMode === "replace" || selectionMode === "add";
  return <><Text style={styles.kicker}>{selectionMode === "add" ? "ADD EXERCISE" : source ? "REPLACE EXERCISE" : "EXERCISE CATALOG"}</Text><Text style={styles.title}>{selectionMode === "add" ? "Choose exercise" : source ? `Replace ${source.name}` : "Library"}</Text>
    {selecting && <View style={styles.notice}><Text style={styles.noticeTitle}>FULL EXERCISE LIBRARY</Text><Text style={styles.noticeText}>{selectionMode === "add" ? "Choose an additional exercise for this workout. Existing exercises will remain unchanged." : "Choose any exercise. Search for the movement you want. Your current sets and rep range will be retained."}</Text></View>}
    <TextInput value={search} onChangeText={setSearch} placeholder="Search exercises" placeholderTextColor="#687067" style={styles.search} autoCapitalize="none" autoCorrect={false} />
    <View style={styles.resultHeader}><Text style={styles.filterLabel}>{results.length} RESULTS</Text>{selecting && <Pressable onPress={onCancelSelection}><Text style={styles.cancel}>CANCEL</Text></Pressable>}</View>
    {results.map((exercise) => { const preference = preferredIds.includes(exercise.id) ? "preferred" : profileExcludedIds.includes(exercise.id) ? "excluded" : "neutral"; return <View key={exercise.id} style={styles.card}><View style={styles.cardTop}><View style={styles.cardCopy}><Text style={styles.name}>{exercise.name}</Text><Text style={styles.meta}>{exercise.movementPattern.replaceAll("-", " ")} · {exercise.modality} · {exercise.difficulty}</Text></View>{onSelect && <Pressable accessibilityRole="button" accessibilityLabel={`${selectionMode === "add" ? "Add" : "Choose"} ${exercise.name}`} onPress={() => onSelect(exercise)} style={styles.choose}><Text style={styles.chooseText}>{selectionMode === "add" ? "ADD" : "CHOOSE"}</Text></Pressable>}</View><Text style={styles.detail}>{exercise.primaryMuscles.join(", ")} · {exercise.equipment.join(", ")}</Text><Text style={styles.reps}>Hypertrophy: {exercise.defaultRepRanges.hypertrophy[0]}–{exercise.defaultRepRanges.hypertrophy[1]} reps</Text><Text style={styles.physiqueMeta}>{exercise.trainingRole?.replaceAll("-", " ")} · {exercise.resistanceProfile} resistance{exercise.intensityTechniques?.length ? ` · ${exercise.intensityTechniques.map((item) => item.replaceAll("-", " ")).join(", ")}` : ""}</Text>{!selecting && onPreference && <View style={styles.preferenceRow}><Pressable onPress={() => onPreference(exercise.id, preference === "preferred" ? "neutral" : "preferred")} style={[styles.preference, preference === "preferred" && styles.preferenceActive]}><Text style={[styles.preferenceText, preference === "preferred" && styles.preferenceTextActive]}>{preference === "preferred" ? "★ PREFERRED" : "☆ PREFER"}</Text></Pressable><Pressable onPress={() => onPreference(exercise.id, preference === "excluded" ? "neutral" : "excluded")} style={[styles.preference, preference === "excluded" && styles.excludeActive]}><Text style={[styles.preferenceText, preference === "excluded" && styles.excludeTextActive]}>{preference === "excluded" ? "EXCLUDED" : "EXCLUDE"}</Text></Pressable></View>}</View>; })}
    {results.length === 0 && <View style={styles.empty}><Text style={styles.emptyTitle}>No matching exercises</Text><Text style={styles.emptyText}>Try another search.</Text></View>}
  </>;
}

const styles = StyleSheet.create({
  kicker: { color: "#8d958c", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 30 }, title: { color: "#f8faf5", fontSize: 34, fontWeight: "800", marginTop: 4 },
  notice: { backgroundColor: "#202a1d", borderLeftColor: "#d8ff38", borderLeftWidth: 3, borderRadius: 8, padding: 13, marginTop: 16 }, noticeTitle: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .8 }, noticeText: { color: "#aab3a7", fontSize: 11, lineHeight: 16, marginTop: 4, textTransform: "capitalize" },
  search: { height: 46, borderRadius: 8, backgroundColor: "#1a1f1a", color: "#f3f5f1", fontSize: 14, paddingHorizontal: 14, marginTop: 17, borderColor: "#303730", borderWidth: 1 },
  filterLabel: { color: "#90988e", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 18, marginBottom: 7 },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }, cancel: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .8, marginBottom: 7 },
  card: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 14, marginTop: 8 }, cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, cardCopy: { flex: 1, paddingRight: 8 }, name: { color: "#f0f3ef", fontSize: 15, fontWeight: "800" }, meta: { color: "#858d83", fontSize: 10, marginTop: 4, textTransform: "capitalize" }, detail: { color: "#aab3a7", fontSize: 10, marginTop: 10, textTransform: "capitalize" }, reps: { color: "#d8ff38", fontSize: 10, fontWeight: "700", marginTop: 5 }, physiqueMeta: { color: "#899188", fontSize: 9, lineHeight: 13, marginTop: 5, textTransform: "capitalize" },
  choose: { backgroundColor: "#d8ff38", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 9 }, chooseText: { color: "#15200e", fontSize: 8, fontWeight: "900" },
  preferenceRow: { flexDirection: "row", gap: 7, marginTop: 11 }, preference: { flex: 1, borderRadius: 6, borderWidth: 1, borderColor: "#465044", paddingVertical: 8, alignItems: "center" }, preferenceActive: { backgroundColor: "#d8ff38", borderColor: "#d8ff38" }, excludeActive: { backgroundColor: "#4a2420", borderColor: "#b15f51" }, preferenceText: { color: "#aab2a8", fontSize: 8, fontWeight: "900" }, preferenceTextActive: { color: "#15200e" }, excludeTextActive: { color: "#ffd1ca" },
  empty: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 20, marginTop: 8 }, emptyTitle: { color: "#f0f3ef", fontSize: 15, fontWeight: "800" }, emptyText: { color: "#858d83", fontSize: 11, marginTop: 5 },
});
