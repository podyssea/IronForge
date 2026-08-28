import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export type NumberOption = { value: number; label: string };

export function NumberPicker({ label, value, options, startingValue = value, disabled, allowCustom = false, onChange, onCustomChange }: { label: string; value: number; options: NumberOption[]; startingValue?: number; disabled?: boolean; allowCustom?: boolean; onChange: (value: number) => void; onCustomChange?: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const listRef = useRef<FlatList<NumberOption>>(null);
  const selected = options.find((option) => option.value === value) ?? { value, label: String(value) };
  const pickerDisabled = disabled || (options.length <= 1 && !allowCustom);
  const parsedCustomValue = Number(customValue.replace(",", "."));
  const customValueIsValid = customValue.trim().length > 0 && Number.isFinite(parsedCustomValue) && parsedCustomValue >= 0;
  const applyCustomValue = () => {
    if (!customValueIsValid) return;
    (onCustomChange ?? onChange)(parsedCustomValue);
    setCustomValue("");
    setOpen(false);
  };
  useEffect(() => {
    if (!open) return;
    const index = Math.max(0, options.findIndex((option) => option.value === startingValue));
    setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: .45, animated: false }), 0);
  }, [open, options, startingValue]);
  return <>
    <Pressable disabled={pickerDisabled} accessibilityRole="button" accessibilityLabel={`${label}: ${selected.label}`} onPress={() => setOpen(true)} style={[styles.trigger, disabled && styles.triggerDisabled]}><Text style={[styles.triggerText, disabled && styles.triggerTextDisabled]}>{selected.label}</Text>{options.length > 1 && <Text style={styles.chevron}>⌄</Text>}</Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoider}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>SELECT VALUE</Text><Text numberOfLines={2} style={styles.title}>{label}</Text></View><Pressable onPress={() => setOpen(false)} style={styles.close}><Text style={styles.closeText}>DONE</Text></Pressable></View>
          {allowCustom && <View style={styles.customRow}><TextInput value={customValue} onChangeText={setCustomValue} onSubmitEditing={applyCustomValue} placeholder="Custom weight" placeholderTextColor="#727a70" keyboardType="decimal-pad" returnKeyType="done" style={styles.customInput} /><Pressable disabled={!customValueIsValid} onPress={applyCustomValue} style={[styles.customButton, !customValueIsValid && styles.customButtonDisabled]}><Text style={styles.customButtonText}>USE</Text></Pressable></View>}
          <FlatList ref={listRef} data={options} style={styles.options} contentContainerStyle={styles.optionsContent} showsVerticalScrollIndicator getItemLayout={(_, index) => ({ length: 46, offset: 46 * index, index })} keyExtractor={(option) => `${option.value}:${option.label}`} renderItem={({ item: option }) => <Pressable onPress={() => { onChange(option.value); setOpen(false); }} style={[styles.option, option.value === value && styles.optionActive]}><Text style={[styles.optionText, option.value === value && styles.optionTextActive]}>{option.label}</Text>{option.value === value ? <Text style={styles.check}>✓</Text> : null}</Pressable>} />
        </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  trigger: { height: 36, flexDirection: "row", alignItems: "center", gap: 5 }, triggerDisabled: { opacity: .55 }, triggerText: { color: "#f5f7f2", fontSize: 16, fontWeight: "800" }, triggerTextDisabled: { color: "#8a9288" }, chevron: { color: "#778075", fontSize: 15, marginTop: -3 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.72)", justifyContent: "flex-end" }, keyboardAvoider: { width: "100%", justifyContent: "flex-end" }, sheet: { maxHeight: "68%", backgroundColor: "#1a1f1a", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 },
  header: { flexDirection: "row", alignItems: "center", paddingBottom: 12 }, headerCopy: { flex: 1, minWidth: 0, paddingRight: 12 }, eyebrow: { color: "#d8ff38", fontSize: 8, fontWeight: "900", letterSpacing: 1 }, title: { color: "#f5f7f2", fontSize: 17, fontWeight: "900", lineHeight: 21, marginTop: 3 }, close: { flexShrink: 0, borderWidth: 1, borderColor: "#5e685b", borderRadius: 6, paddingHorizontal: 13, paddingVertical: 9 }, closeText: { color: "#d8ff38", fontSize: 9, fontWeight: "900" },
  customRow: { flexDirection: "row", gap: 8, marginBottom: 12 }, customInput: { flex: 1, height: 44, borderWidth: 1, borderColor: "#515b4f", borderRadius: 7, paddingHorizontal: 12, color: "#f5f7f2", fontSize: 15, fontWeight: "700" }, customButton: { width: 70, height: 44, borderRadius: 7, backgroundColor: "#d8ff38", alignItems: "center", justifyContent: "center" }, customButtonDisabled: { opacity: .3 }, customButtonText: { color: "#15200e", fontSize: 10, fontWeight: "900", letterSpacing: .8 },
  options: { borderTopWidth: 1, borderTopColor: "#303730" }, optionsContent: { paddingVertical: 7 }, option: { minHeight: 46, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#2b312b", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, optionActive: { backgroundColor: "#25301f", borderRadius: 7 }, optionText: { color: "#b7bfb4", fontSize: 16, fontWeight: "700" }, optionTextActive: { color: "#f4f7ef" }, check: { color: "#d8ff38", fontSize: 17, fontWeight: "900" },
});
