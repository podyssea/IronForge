import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { EXERCISE_LIBRARY, ExerciseDefinition } from "../domain/exerciseLibrary";

type InlineExercisePickerProps = {
  exerciseId: string;
  excludedIds: string[];
  preferredIds?: string[];
  onSelect: (exercise: ExerciseDefinition) => void;
  onCancel: () => void;
};

export function InlineExercisePicker({ exerciseId, excludedIds, onSelect, onCancel }: InlineExercisePickerProps) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const results = useMemo(() => EXERCISE_LIBRARY
    .filter((exercise) => exercise.id !== exerciseId && !excludedIds.includes(exercise.id))
    .filter((exercise) => !query || [
      exercise.name,
      exercise.movementPattern,
      ...exercise.primaryMuscles,
      ...exercise.equipment,
    ].some((value) => value.replaceAll("-", " ").toLowerCase().includes(query)))
    .sort((left, right) => left.name.localeCompare(right.name)), [excludedIds, exerciseId, query]);

  return <View style={styles.container}>
    <View style={styles.dropdownTop}><Text style={styles.dropdownLabel}>SELECT REPLACEMENT</Text><Pressable accessibilityRole="button" accessibilityLabel="Close exercise dropdown" onPress={onCancel} hitSlop={8}><Text style={styles.close}>CLOSE ▲</Text></Pressable></View>
    <TextInput value={search} onChangeText={setSearch} placeholder="Type to filter exercises" placeholderTextColor="#687067" style={styles.search} autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
    <Text style={styles.resultLabel}>{results.length} EXERCISES · A–Z</Text>
    <ScrollView style={styles.options} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
      {results.map((exercise) => <Pressable key={exercise.id} accessibilityRole="button" accessibilityLabel={`Replace with ${exercise.name}`} onPress={() => onSelect(exercise)} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}><Text style={styles.name}>{exercise.name}</Text><Text style={styles.chevron}>›</Text></Pressable>)}
      {!results.length && <View style={styles.empty}><Text style={styles.emptyTitle}>No matching exercises</Text><Text style={styles.emptyText}>Try a muscle, equipment type, or another name.</Text></View>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#151915", borderColor: "#566052", borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, paddingHorizontal: 10, paddingBottom: 8 },
  dropdownTop: { height: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, dropdownLabel: { color: "#929b8f", fontSize: 8, fontWeight: "900", letterSpacing: .8 }, close: { color: "#d8ff38", fontSize: 8, fontWeight: "900", letterSpacing: .6 },
  search: { height: 38, borderRadius: 6, backgroundColor: "#202620", color: "#f3f5f1", fontSize: 12, paddingHorizontal: 11, borderColor: "#3d463a", borderWidth: 1 },
  resultLabel: { color: "#858e82", fontSize: 7, fontWeight: "900", letterSpacing: .8, marginTop: 10, marginBottom: 2 },
  options: { maxHeight: 252 },
  option: { minHeight: 42, borderTopWidth: 1, borderTopColor: "#30372f", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, optionPressed: { backgroundColor: "#242c20" },
  name: { color: "#eef1eb", fontSize: 12, fontWeight: "700", flex: 1 }, chevron: { color: "#d8ff38", fontSize: 20, fontWeight: "700" },
  empty: { paddingVertical: 14 }, emptyTitle: { color: "#eef1eb", fontSize: 12, fontWeight: "800" }, emptyText: { color: "#8e988a", fontSize: 10, marginTop: 4 },
});
