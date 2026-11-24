import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { displayWeight, SessionRecord, WeightUnit, weightUnitLabel, Workout } from "../domain/training";
import {
  addBackfillSet,
  BackfillDraftUpdateError,
  calendarDateForRecord,
  createWorkoutBackfillDraft,
  parsePastCalendarDate,
  removeBackfillSet,
  Result,
  SaveBackfill,
  updateBackfillNotes,
  updateBackfillSet,
  WorkoutBackfillDraft,
} from "../domain/workoutBackfill";
import { MissedWorkoutEditor } from "./MissedWorkoutEditor";

type MissedWorkoutFlowProps = {
  workouts: readonly Workout[];
  records: readonly SessionRecord[];
  weightUnit: WeightUnit;
  storageError: string | null;
  onSave: SaveBackfill;
  onDirtyChange: (dirty: boolean) => void;
  onRequestScrollTop: () => void;
  onReturnToActiveWorkout: () => void;
  onSaved: (recordId: string, performedOn: string, completedSets: number) => void;
  onCancel: () => void;
};

export function MissedWorkoutFlow({ workouts, records, weightUnit, storageError, onSave, onDirtyChange, onRequestScrollTop, onReturnToActiveWorkout, onSaved, onCancel }: MissedWorkoutFlowProps) {
  const [dateText, setDateText] = useState(() => calendarDateOffset(-1));
  const [sourceType, setSourceType] = useState<SourceType>("planned");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [draft, setDraft] = useState<WorkoutBackfillDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const visiblePreviousRecords = useMemo(() => records.filter((record) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return record.workoutTitle.toLowerCase().includes(query) || (calendarDateForRecord(record) ?? "").includes(query);
  }).slice(0, visibleCount), [records, search, visibleCount]);

  const markDirty = () => {
    if (!dirty) { setDirty(true); onDirtyChange(true); }
  };

  const clearDraft = () => {
    setDraft(null);
    setDirty(false);
    onDirtyChange(false);
    setErrorMessage(undefined);
    onRequestScrollTop();
  };

  const beginDraft = (source: { type: "planned"; workout: Workout } | { type: "history"; record: SessionRecord }) => {
    const date = parsePastCalendarDate(dateText);
    if (!date.ok) return setErrorMessage(date.error.message);
    setErrorMessage(undefined);
    setDirty(false);
    onDirtyChange(false);
    setDraft(createWorkoutBackfillDraft({ performedOn: date.value, source }));
    onRequestScrollTop();
  };

  const updateDraft = (nextDraft: WorkoutBackfillDraft) => {
    setDraft(nextDraft);
    markDirty();
    setErrorMessage(undefined);
  };

  const applyDraftUpdate = (result: Result<WorkoutBackfillDraft, BackfillDraftUpdateError>) => {
    if (result.ok) updateDraft(result.value);
    else setErrorMessage(result.error.message);
  };

  const requestExit = (action: () => void) => {
    if (!dirty) return action();
    Alert.alert("Discard this missed workout?", "Your set changes and notes will be lost.", [{ text: "Keep editing", style: "cancel" }, { text: "Discard", style: "destructive", onPress: action }]);
  };

  const changeSource = () => requestExit(clearDraft);
  const cancel = () => requestExit(() => { onDirtyChange(false); onCancel(); });

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setErrorMessage(undefined);
    const result = await onSave(draft);
    setSaving(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      if (result.error.code === "ACTIVE_SESSION_CONFLICT") onReturnToActiveWorkout();
      return;
    }
    onDirtyChange(false);
    onSaved(result.value.recordId, draft.performedOn, draft.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length, 0));
  };

  if (draft) {
    return <MissedWorkoutEditor
      draft={draft}
      weightUnit={weightUnit}
      isSaving={saving}
      errorMessage={errorMessage}
      onSetChange={(exerciseId, setIndex, patch) => applyDraftUpdate(updateBackfillSet(draft, exerciseId, setIndex, patch))}
      onAddSet={(exerciseId) => applyDraftUpdate(addBackfillSet(draft, exerciseId))}
      onRemoveSet={(exerciseId, setIndex) => applyDraftUpdate(removeBackfillSet(draft, exerciseId, setIndex))}
      onNotesChange={(notes) => updateDraft(updateBackfillNotes(draft, notes))}
      onChangeSource={changeSource}
      onSave={() => void save()}
      onCancel={cancel}
    />;
  }

  return <View>
    <Pressable accessibilityRole="button" onPress={onCancel} style={styles.back}><Text style={styles.backText}>← BACK TO HISTORY</Text></Pressable>
    <Text style={styles.kicker}>MISSED WORKOUT</Text><Text accessibilityRole="header" style={styles.title}>When did you train?</Text><Text style={styles.helper}>Choose the real workout date, then copy a known workout.</Text>
    <View style={styles.dateBlock}><Text style={styles.label}>WORKOUT DATE · YYYY-MM-DD</Text><TextInput accessibilityLabel="Workout date, year month day" value={dateText} onChangeText={(value) => { setDateText(value); setErrorMessage(undefined); }} onBlur={() => { const result = parsePastCalendarDate(dateText); if (!result.ok) setErrorMessage(result.error.message); }} keyboardType="numbers-and-punctuation" maxLength={10} style={styles.dateInput} /><Text style={styles.resolvedDate}>{formatDateText(dateText)}</Text><View style={styles.quickDates}><DateShortcut label="YESTERDAY" value={calendarDateOffset(-1)} onChoose={(value) => { setDateText(value); setErrorMessage(undefined); }} /><DateShortcut label="TODAY" value={calendarDateOffset(0)} onChoose={(value) => { setDateText(value); setErrorMessage(undefined); }} /></View>{storageError ? <Text style={styles.storageWarning}>Storage previously failed. Saving will retry before this workout closes.</Text> : null}{errorMessage ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{errorMessage}</Text> : null}</View>
    <Text style={styles.section}>START FROM</Text>
    <SourceTypeTabs
      selected={sourceType}
      onSelect={(type) => {
        setSourceType(type);
        setErrorMessage(undefined);
      }}
    />
    {sourceType === "planned" ? (
      <PlannedWorkoutSources workouts={workouts} onChoose={(workout) => beginDraft({ type: "planned", workout })} />
    ) : (
      <PreviousWorkoutSources
        records={visiblePreviousRecords}
        totalRecordCount={records.length}
        search={search}
        weightUnit={weightUnit}
        onSearch={(value) => {
          setSearch(value);
          setVisibleCount(12);
        }}
        onShowMore={() => setVisibleCount((count) => count + 12)}
        onChoose={(record) => beginDraft({ type: "history", record })}
      />
    )}
  </View>;
}

type SourceType = "planned" | "history";

function SourceTypeTabs({ selected, onSelect }: { selected: SourceType; onSelect: (type: SourceType) => void }) {
  return <View accessibilityRole="tablist" style={styles.tabs}>
    {(["planned", "history"] as const).map((type) => (
      <Pressable key={type} accessibilityRole="tab" accessibilityState={{ selected: selected === type }} onPress={() => onSelect(type)} style={[styles.tab, selected === type && styles.tabActive]}>
        <Text style={[styles.tabText, selected === type && styles.tabTextActive]}>{type === "planned" ? "PLANNED" : "PREVIOUS"}</Text>
      </Pressable>
    ))}
  </View>;
}

function PlannedWorkoutSources({ workouts, onChoose }: { workouts: readonly Workout[]; onChoose: (workout: Workout) => void }) {
  return <View>{workouts.map((workout, index) => (
    <SourceRow
      key={workout.id}
      eyebrow={`DAY ${index + 1}`}
      title={workout.title.split(" · ").pop() ?? workout.title}
      detail={`${workout.exercises.length} exercises · ${workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)} sets`}
      onPress={() => onChoose(workout)}
    />
  ))}</View>;
}

type PreviousWorkoutSourcesProps = {
  records: readonly SessionRecord[];
  totalRecordCount: number;
  search: string;
  weightUnit: WeightUnit;
  onSearch: (value: string) => void;
  onShowMore: () => void;
  onChoose: (record: SessionRecord) => void;
};

function PreviousWorkoutSources({ records, totalRecordCount, search, weightUnit, onSearch, onShowMore, onChoose }: PreviousWorkoutSourcesProps) {
  return <View>
    <TextInput accessibilityLabel="Search previous workouts" value={search} onChangeText={onSearch} placeholder="Search title or YYYY-MM-DD" placeholderTextColor="#687067" style={styles.search} />
    {records.length ? records.map((record) => (
      <SourceRow
        key={record.id}
        eyebrow={formatRecordDate(record)}
        title={record.workoutTitle.split(" · ").pop() ?? record.workoutTitle}
        detail={`${completedSetCount(record)} completed sets · ${record.volume === null ? "volume unavailable" : `${displayWeight(record.volume, weightUnit).toLocaleString()} ${weightUnitLabel(weightUnit)}`}`}
        onPress={() => onChoose(record)}
      />
    )) : (
      <View style={styles.empty}><Text style={styles.emptyTitle}>No matching workouts</Text><Text style={styles.emptyText}>Choose Planned to copy your current routine, or change your search.</Text></View>
    )}
    {records.length < totalRecordCount && !search.trim() ? <Pressable accessibilityRole="button" onPress={onShowMore} style={styles.more}><Text style={styles.moreText}>SHOW EARLIER WORKOUTS</Text></Pressable> : null}
  </View>;
}

function completedSetCount(record: SessionRecord): number {
  return record.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length, 0);
}

function DateShortcut({ label, value, onChoose }: { label: string; value: string; onChoose: (value: string) => void }) { return <Pressable accessibilityRole="button" onPress={() => onChoose(value)} style={styles.quickDate}><Text style={styles.quickDateText}>{label}</Text></Pressable>; }
function SourceRow({ eyebrow, title, detail, onPress }: { eyebrow: string; title: string; detail: string; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={`${eyebrow}, ${title}, ${detail}`} onPress={onPress} style={({ pressed }) => [styles.sourceRow, pressed && styles.pressed]}><View style={styles.sourceCopy}><Text style={styles.sourceEyebrow}>{eyebrow}</Text><Text style={styles.sourceTitle}>{title}</Text><Text style={styles.sourceDetail}>{detail}</Text></View><Text style={styles.arrow}>→</Text></Pressable>; }
function calendarDateOffset(days: number): string { const value = new Date(); value.setDate(value.getDate() + days); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function formatDateText(value: string): string { const parsed = parsePastCalendarDate(value); if (!parsed.ok) return "Enter a valid date"; const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function formatRecordDate(record: SessionRecord): string { const value = calendarDateForRecord(record); if (!value) return "DATE UNAVAILABLE"; const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).toUpperCase(); }

const styles = StyleSheet.create({
  back: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", marginTop: 10 }, backText: { color: "#d8ff38", fontSize: 9, fontWeight: "900", letterSpacing: .7 }, kicker: { color: "#8d958c", fontSize: 9, fontWeight: "900", letterSpacing: 1.1, marginTop: 14 }, title: { color: "#f8faf5", fontSize: 28, fontWeight: "900", marginTop: 4 }, helper: { color: "#aab3a7", fontSize: 12, lineHeight: 18, marginTop: 6 }, dateBlock: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 13, marginTop: 17 }, label: { color: "#90988e", fontSize: 8, fontWeight: "900", letterSpacing: .8 }, dateInput: { minHeight: 48, borderRadius: 7, borderWidth: 1, borderColor: "#566052", backgroundColor: "#151915", color: "#f5f7f2", fontSize: 18, fontWeight: "900", letterSpacing: 1, paddingHorizontal: 12, marginTop: 7 }, resolvedDate: { color: "#dce1db", fontSize: 11, marginTop: 8 }, quickDates: { flexDirection: "row", gap: 8, marginTop: 10 }, quickDate: { minHeight: 44, flex: 1, borderRadius: 7, borderWidth: 1, borderColor: "#626b5f", alignItems: "center", justifyContent: "center" }, quickDateText: { color: "#d8ff38", fontSize: 9, fontWeight: "900" }, storageWarning: { color: "#d7c788", fontSize: 10, lineHeight: 15, marginTop: 8 }, error: { color: "#e28b7d", fontSize: 10, lineHeight: 15, fontWeight: "700", marginTop: 8 }, section: { color: "#90988e", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 22, marginBottom: 7 }, tabs: { flexDirection: "row", backgroundColor: "#1a1f1a", borderRadius: 8, padding: 4, gap: 4 }, tab: { minHeight: 44, flex: 1, borderRadius: 6, alignItems: "center", justifyContent: "center" }, tabActive: { backgroundColor: "#d8ff38" }, tabText: { color: "#a2aba0", fontSize: 10, fontWeight: "900" }, tabTextActive: { color: "#15190f" }, search: { minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: "#566052", color: "#f5f7f2", paddingHorizontal: 12, fontSize: 13, marginTop: 10 }, sourceRow: { minHeight: 70, backgroundColor: "#1a1f1a", borderRadius: 9, padding: 13, marginTop: 9, flexDirection: "row", alignItems: "center" }, pressed: { opacity: .72 }, sourceCopy: { flex: 1, paddingRight: 8 }, sourceEyebrow: { color: "#d8ff38", fontSize: 8, fontWeight: "900", letterSpacing: .7 }, sourceTitle: { color: "#eff2ed", fontSize: 15, fontWeight: "800", marginTop: 3 }, sourceDetail: { color: "#858d83", fontSize: 10, marginTop: 4 }, arrow: { color: "#d8ff38", fontSize: 20, fontWeight: "800" }, empty: { backgroundColor: "#1a1f1a", borderRadius: 9, padding: 18, marginTop: 10 }, emptyTitle: { color: "#f4f6f1", fontSize: 15, fontWeight: "800" }, emptyText: { color: "#8d958b", fontSize: 11, lineHeight: 17, marginTop: 6 }, more: { minHeight: 44, borderRadius: 7, borderWidth: 1, borderColor: "#626b5f", alignItems: "center", justifyContent: "center", marginTop: 10 }, moreText: { color: "#d8ff38", fontSize: 9, fontWeight: "900" },
});
