import { StyleSheet, Text, View } from "react-native";
import { MAX_DEADLIFT_PLANNED_REPS } from "../domain/deadlift";
import type { Exercise } from "../domain/training";
import { NumberPicker } from "./NumberPicker";

type PrescriptionChanges = { targetSets?: number; repRange?: [number, number] };

const setOptions = Array.from({ length: 20 }, (_, index) => ({ value: index + 1, label: String(index + 1) }));
const repOptions = setOptions.slice(0, MAX_DEADLIFT_PLANNED_REPS);

export function DeadliftPrescriptionControls({ exercise, onChange }: {
  exercise: Exercise;
  onChange: (changes: PrescriptionChanges) => void;
}) {
  const [minimum, maximum] = exercise.repRange;
  return <View style={styles.controls}>
    <View>
      <Text style={styles.label}>Working sets</Text>
      <NumberPicker label="Planned deadlift working sets" value={exercise.targetSets} options={setOptions}
        onChange={(targetSets) => onChange({ targetSets })} />
    </View>
    <View>
      <Text style={styles.label}>Min reps</Text>
      <NumberPicker label="Minimum planned deadlift reps" value={minimum} options={repOptions}
        onChange={(reps) => onChange({ repRange: [reps, Math.max(reps, maximum)] })} />
    </View>
    <View>
      <Text style={styles.label}>Max reps</Text>
      <NumberPicker label="Maximum planned deadlift reps" value={maximum} options={repOptions}
        onChange={(reps) => onChange({ repRange: [Math.min(minimum, reps), reps] })} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  controls: { flexDirection: "row", flexWrap: "wrap", columnGap: 18, paddingHorizontal: 8, paddingVertical: 6 },
  label: { color: "#b9c1b6", fontSize: 12, fontWeight: "700" },
});
