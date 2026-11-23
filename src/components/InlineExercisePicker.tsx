import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Equipment, ExerciseDefinition } from "../domain/exerciseLibrary";
import { ExerciseCandidate, rankExerciseCandidates } from "../domain/exerciseRecommendations";

type InlineExercisePickerProps = {
  exerciseId: string;
  excludedIds: string[];
  preferredIds?: string[];
  profileExcludedIds?: string[];
  availableEquipment?: Equipment[];
  onSelect: (exercise: ExerciseDefinition) => void;
  onCancel: () => void;
  mode?: "add" | "replace";
};

export function InlineExercisePicker({ exerciseId, excludedIds, preferredIds = [], profileExcludedIds = [], availableEquipment, onSelect, onCancel, mode = "replace" }: InlineExercisePickerProps) {
  const [search, setSearch] = useState("");
  const hasSearch = Boolean(search.trim());
  const candidates = useMemo(() => rankExerciseCandidates({
    currentExerciseId: exerciseId || undefined,
    workoutExerciseIds: excludedIds,
    availableEquipment,
    preferredExerciseIds: preferredIds,
    excludedExerciseIds: profileExcludedIds,
    search,
  }), [availableEquipment, excludedIds, exerciseId, preferredIds, profileExcludedIds, search]);
  const suggested = useMemo(() => hasSearch ? [] : candidates
    .filter((candidate) => candidate.match !== "other" || candidate.preferred)
    .slice(0, 6), [candidates, hasSearch]);
  const suggestedIds = useMemo(() => new Set(suggested.map((candidate) => candidate.exercise.id)), [suggested]);
  const library = useMemo(() => candidates
    .filter((candidate) => !suggestedIds.has(candidate.exercise.id))
    .sort((left, right) => left.exercise.name.localeCompare(right.exercise.name) || left.exercise.id.localeCompare(right.exercise.id)), [candidates, suggestedIds]);
  const action = mode === "add" ? "Add" : "Replace with";

  return <View style={styles.container}>
    <View style={styles.dropdownTop}>
      <Text accessibilityRole="header" style={styles.dropdownLabel}>{mode === "add" ? "SELECT EXERCISE" : "SELECT REPLACEMENT"}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel exercise selection" accessibilityHint="Closes the exercise picker without making a change" onPress={onCancel} hitSlop={4} style={styles.closeButton}><Text style={styles.close}>CANCEL</Text></Pressable>
    </View>
    <TextInput accessibilityLabel="Search exercises" accessibilityHint="Search by exercise name, muscle, equipment, or movement" value={search} onChangeText={setSearch} placeholder="Search name, muscle, or equipment" placeholderTextColor="#8a9387" style={styles.search} autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
    <Text style={styles.resultSummary} accessibilityLiveRegion="polite">{candidates.length} {candidates.length === 1 ? "exercise" : "exercises"} available</Text>
    <ScrollView style={styles.options} nestedScrollEnabled keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator contentContainerStyle={styles.optionContent}>
      {suggested.length > 0 && <ExerciseSection title="SUGGESTED" candidates={suggested} action={action} onSelect={onSelect} />}
      {library.length > 0 && <ExerciseSection title={hasSearch ? "SEARCH RESULTS" : suggested.length ? "ALL EXERCISES · A–Z" : "EXERCISES · A–Z"} candidates={library} action={action} onSelect={onSelect} />}
      {!candidates.length && <View accessibilityRole="summary" style={styles.empty}><Text style={styles.emptyTitle}>No matching exercises</Text><Text style={styles.emptyText}>Try another name, muscle, movement, or equipment type.</Text></View>}
    </ScrollView>
  </View>;
}

function ExerciseSection({ title, candidates, action, onSelect }: { title: string; candidates: ExerciseCandidate[]; action: string; onSelect: (exercise: ExerciseDefinition) => void }) {
  return <View>
    <Text accessibilityRole="header" style={styles.sectionLabel}>{title}</Text>
    {candidates.map(({ exercise, match, preferred }) => {
      const metadata = `${exercise.primaryMuscles.map(readable).join(", ")} · ${exercise.equipment.map(readable).join(", ")}`;
      const reason = match === "substitution" ? "Direct substitute" : match === "compatible" ? "Similar movement" : preferred ? "Preferred" : undefined;
      return <Pressable key={exercise.id} accessibilityRole="button" accessibilityLabel={`${action} ${exercise.name}`} accessibilityHint={`${reason ? `${reason}. ` : ""}${metadata}`} onPress={() => onSelect(exercise)} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
        <View style={styles.optionCopy}><View style={styles.nameRow}><Text style={styles.name}>{exercise.name}</Text>{reason && <Text style={styles.reason}>{reason.toUpperCase()}</Text>}</View><Text style={styles.metadata}>{metadata}</Text></View>
        <Text aria-hidden style={styles.chevron}>›</Text>
      </Pressable>;
    })}
  </View>;
}

function readable(value: string): string {
  return value.replaceAll("-", " ");
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#151915", borderColor: "#566052", borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, paddingHorizontal: 10, paddingBottom: 8 },
  dropdownTop: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, dropdownLabel: { color: "#aeb7ab", fontSize: 10, fontWeight: "900", letterSpacing: .8, flexShrink: 1 }, closeButton: { minHeight: 44, minWidth: 64, alignItems: "flex-end", justifyContent: "center" }, close: { color: "#d8ff38", fontSize: 10, fontWeight: "900", letterSpacing: .6 },
  search: { minHeight: 44, borderRadius: 7, backgroundColor: "#202620", color: "#f3f5f1", fontSize: 16, paddingHorizontal: 12, borderColor: "#566052", borderWidth: 1 },
  resultSummary: { color: "#a2aba0", fontSize: 11, fontWeight: "700", marginTop: 10, marginBottom: 2 },
  options: { maxHeight: 330 }, optionContent: { paddingBottom: 4 },
  sectionLabel: { color: "#a2aba0", fontSize: 10, fontWeight: "900", letterSpacing: .8, marginTop: 10, marginBottom: 3 },
  option: { minHeight: 56, borderTopWidth: 1, borderTopColor: "#30372f", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 7, paddingHorizontal: 2 }, optionPressed: { backgroundColor: "#242c20" }, optionCopy: { flex: 1, paddingRight: 8 }, nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  name: { color: "#eef1eb", fontSize: 14, fontWeight: "700", flexShrink: 1 }, reason: { color: "#d8ff38", fontSize: 8, fontWeight: "900", letterSpacing: .5 }, metadata: { color: "#a2aba0", fontSize: 11, marginTop: 3, textTransform: "capitalize" }, chevron: { color: "#d8ff38", fontSize: 24, fontWeight: "700" },
  empty: { paddingVertical: 24 }, emptyTitle: { color: "#eef1eb", fontSize: 14, fontWeight: "800" }, emptyText: { color: "#a2aba0", fontSize: 12, lineHeight: 18, marginTop: 5 },
});
