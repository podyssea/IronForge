import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export type NumberOption = { value: number; label: string };

export function NumberPicker({ label, value, options, disabled, allowCustom = false, onChange, onCustomChange }: { label: string; value: number; options: NumberOption[]; startingValue?: number; disabled?: boolean; allowCustom?: boolean; onChange: (value: number) => void; onCustomChange?: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const selected = options.find((option) => option.value === value) ?? { value, label: String(value) };
  const pickerDisabled = disabled || (options.length <= 1 && !allowCustom);
  const denseOptions = options.length > 12;
  const veryDenseOptions = options.length > 80;
  const parsedCustomValue = Number(customValue.replace(",", "."));
  const customValueIsValid = customValue.trim().length > 0 && Number.isFinite(parsedCustomValue) && parsedCustomValue >= 0;
  const applyCustomValue = () => {
    if (!customValueIsValid) return;
    (onCustomChange ?? onChange)(parsedCustomValue);
    setCustomValue("");
    setOpen(false);
  };
  return <>
    <Pressable disabled={pickerDisabled} accessibilityRole="button" accessibilityLabel={`${label}: ${selected.label}`} onPress={() => setOpen(true)} style={[styles.trigger, disabled && styles.triggerDisabled]}><Text style={[styles.triggerText, disabled && styles.triggerTextDisabled]}>{selected.label}</Text>{options.length > 1 && <Text style={styles.chevron}>⌄</Text>}</Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoider}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>SELECT VALUE</Text><Text numberOfLines={2} style={styles.title}>{label}</Text></View><Pressable onPress={() => setOpen(false)} style={styles.close}><Text style={styles.closeText}>DONE</Text></Pressable></View>
          {allowCustom && <View style={styles.customRow}><TextInput value={customValue} onChangeText={setCustomValue} onSubmitEditing={applyCustomValue} placeholder="Custom weight" placeholderTextColor="#727a70" keyboardType="decimal-pad" returnKeyType="done" style={styles.customInput} /><Pressable disabled={!customValueIsValid} onPress={applyCustomValue} style={[styles.customButton, !customValueIsValid && styles.customButtonDisabled]}><Text style={styles.customButtonText}>USE</Text></Pressable></View>}
          <View style={styles.options}><View style={[styles.optionGrid, !denseOptions && styles.optionGridShort]}>{options.map((option) => <Pressable key={`${option.value}:${option.label}`} accessibilityRole="button" accessibilityState={{ selected: option.value === value }} onPress={() => { onChange(option.value); setOpen(false); }} style={[styles.option, veryDenseOptions ? styles.optionVeryDense : denseOptions ? styles.optionDense : styles.optionShort, option.value === value && styles.optionActive]}><Text style={[styles.optionText, veryDenseOptions && styles.optionTextVeryDense, option.value === value && styles.optionTextActive]}>{option.label}</Text>{option.value === value ? <Text style={[styles.check, veryDenseOptions && styles.checkVeryDense]}>✓</Text> : null}</Pressable>)}</View></View>
        </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  trigger: { height: 36, flexDirection: "row", alignItems: "center", gap: 5 }, triggerDisabled: { opacity: .55 }, triggerText: { color: "#f5f7f2", fontSize: 16, fontWeight: "800" }, triggerTextDisabled: { color: "#8a9288" }, chevron: { color: "#778075", fontSize: 15, marginTop: -3 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.72)" }, keyboardAvoider: { flex: 1, width: "100%", justifyContent: "center", paddingHorizontal: 10, paddingVertical: 18 }, sheet: { width: "100%", maxWidth: 520, alignSelf: "center", backgroundColor: "#1a1f1a", borderRadius: 18, padding: 12 },
  header: { flexDirection: "row", alignItems: "center", paddingBottom: 9 }, headerCopy: { flex: 1, minWidth: 0, paddingRight: 8 }, eyebrow: { color: "#d8ff38", fontSize: 8, fontWeight: "900", letterSpacing: 1 }, title: { color: "#f5f7f2", fontSize: 16, fontWeight: "900", lineHeight: 19, marginTop: 2 }, close: { flexShrink: 0, borderWidth: 1, borderColor: "#5e685b", borderRadius: 6, paddingHorizontal: 11, paddingVertical: 8 }, closeText: { color: "#d8ff38", fontSize: 9, fontWeight: "900" },
  customRow: { flexDirection: "row", gap: 6, marginBottom: 9 }, customInput: { flex: 1, height: 38, borderWidth: 1, borderColor: "#515b4f", borderRadius: 7, paddingHorizontal: 10, color: "#f5f7f2", fontSize: 14, fontWeight: "700" }, customButton: { width: 60, height: 38, borderRadius: 7, backgroundColor: "#d8ff38", alignItems: "center", justifyContent: "center" }, customButtonDisabled: { opacity: .3 }, customButtonText: { color: "#15200e", fontSize: 9, fontWeight: "900", letterSpacing: .8 },
  options: { borderTopWidth: 1, borderTopColor: "#303730", paddingTop: 8 }, optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 }, optionGridShort: { flexWrap: "nowrap" }, option: { height: 32, paddingHorizontal: 4, borderWidth: 1, borderColor: "#394137", borderRadius: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 }, optionDense: { width: "15.75%" }, optionVeryDense: { width: "11.5%", height: 26, paddingHorizontal: 1, gap: 1 }, optionShort: { flex: 1 }, optionActive: { backgroundColor: "#25301f", borderColor: "#d8ff38" }, optionText: { color: "#b7bfb4", fontSize: 13, fontWeight: "700" }, optionTextVeryDense: { fontSize: 11 }, optionTextActive: { color: "#f4f7ef" }, check: { color: "#d8ff38", fontSize: 11, fontWeight: "900" }, checkVeryDense: { fontSize: 9 },
});
