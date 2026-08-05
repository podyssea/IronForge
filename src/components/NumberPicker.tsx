import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export type NumberOption = { value: number; label: string };

export function NumberPicker({ label, value, options, disabled, onChange }: { label: string; value: number; options: NumberOption[]; disabled?: boolean; onChange: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? { value, label: String(value) };
  return <>
    <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label}: ${selected.label}`} onPress={() => setOpen(true)} style={[styles.trigger, disabled && styles.triggerDisabled]}><Text style={[styles.triggerText, disabled && styles.triggerTextDisabled]}>{selected.label}</Text><Text style={styles.chevron}>⌄</Text></Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}><View><Text style={styles.eyebrow}>SELECT VALUE</Text><Text style={styles.title}>{label}</Text></View><Pressable onPress={() => setOpen(false)} style={styles.close}><Text style={styles.closeText}>DONE</Text></Pressable></View>
          <ScrollView style={styles.options} contentContainerStyle={styles.optionsContent} showsVerticalScrollIndicator>
            {options.map((option) => <Pressable key={`${option.value}:${option.label}`} onPress={() => { onChange(option.value); setOpen(false); }} style={[styles.option, option.value === value && styles.optionActive]}><Text style={[styles.optionText, option.value === value && styles.optionTextActive]}>{option.label}</Text>{option.value === value ? <Text style={styles.check}>✓</Text> : null}</Pressable>)}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  trigger: { height: 36, flexDirection: "row", alignItems: "center", gap: 5 }, triggerDisabled: { opacity: .55 }, triggerText: { color: "#f5f7f2", fontSize: 16, fontWeight: "800" }, triggerTextDisabled: { color: "#8a9288" }, chevron: { color: "#778075", fontSize: 15, marginTop: -3 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.72)", justifyContent: "flex-end" }, sheet: { maxHeight: "68%", backgroundColor: "#1a1f1a", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12 }, eyebrow: { color: "#d8ff38", fontSize: 8, fontWeight: "900", letterSpacing: 1 }, title: { color: "#f5f7f2", fontSize: 20, fontWeight: "900", marginTop: 3 }, close: { borderWidth: 1, borderColor: "#5e685b", borderRadius: 6, paddingHorizontal: 13, paddingVertical: 9 }, closeText: { color: "#d8ff38", fontSize: 9, fontWeight: "900" },
  options: { borderTopWidth: 1, borderTopColor: "#303730" }, optionsContent: { paddingVertical: 7 }, option: { minHeight: 46, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#2b312b", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, optionActive: { backgroundColor: "#25301f", borderRadius: 7 }, optionText: { color: "#b7bfb4", fontSize: 16, fontWeight: "700" }, optionTextActive: { color: "#f4f7ef" }, check: { color: "#d8ff38", fontSize: 17, fontWeight: "900" },
});
