import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { SessionRecord, Workout, generateFromStyle, initialFourDaySplit, sessionVolume } from "./src/domain/training";
type Tab = "Today" | "Plan" | "Progress" | "Profile";
type Phase = "Hypertrophy" | "Bulk" | "Maintenance" | "Deload";
const KEY = "ironforge.v5";
const bg = { flex: 1, backgroundColor: "#070A0E" } as const;
const card = { backgroundColor: "#111820", padding: 18, borderRadius: 18, marginTop: 16, borderWidth: 1, borderColor: "#202C38" } as const;

export default function App() {
  const [split, setSplit] = useState<Workout[]>(initialFourDaySplit);
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<Tab>("Today");
  const [picker, setPicker] = useState(false);
  const [phase, setPhase] = useState<Phase>("Hypertrophy");
  const [sessions, setSessions] = useState<(SessionRecord & { title: string; date: string })[]>([]);
  useEffect(() => { AsyncStorage.getItem(KEY).then(value => { if (value) { const data = JSON.parse(value); setSplit(data.split ?? initialFourDaySplit()); setSelected(data.selected ?? 0); setSessions(data.sessions ?? []); setPhase(data.phase ?? "Hypertrophy"); } }); }, []);
  useEffect(() => { AsyncStorage.setItem(KEY, JSON.stringify({ split, selected, sessions, phase })); }, [split, selected, sessions, phase]);
  const workout = split[selected];
  const change = (ei: number, si: number, field: "weight" | "reps" | "completed", amount = 0) => {
    const next = JSON.parse(JSON.stringify(split)) as Workout[];
    const set = next[selected].exercises[ei].sets[si];
    if (field === "completed") set.completed = !set.completed;
    else if (field === "weight") set.weight = Math.max(0, set.weight + amount);
    else set.reps = Math.max(1, set.reps + amount);
    setSplit(next);
  };
  const save = () => {
    const sets = workout.exercises.flatMap(e => e.sets).filter(s => s.completed);
    if (!sets.length) return;
    const record: SessionRecord & { title: string; date: string } = { id: String(Date.now()), workoutTitle: workout.title, completedAt: new Date().toISOString(), title: workout.title, date: new Date().toISOString(), exercises: JSON.parse(JSON.stringify(workout.exercises)), volume: sessionVolume(workout.exercises) };
    setSessions(x => [record, ...x]);
  };
  return <SafeAreaView style={bg}><ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 130 }}>
    {tab === "Today" && (picker ? <><Title text="Choose workout" />{split.map((item, index) => <Pressable key={item.id} style={card} onPress={() => { setSelected(index); setPicker(false); }}><Text style={white}>{item.title}</Text><Text style={muted}>{item.focus}</Text></Pressable>)}</> : <><Text style={green}>TODAY'S WORKOUT</Text><Title text={workout.title} /><Pressable style={outline} onPress={() => setPicker(true)}><Text style={green}>Choose a different workout</Text></Pressable>{workout.exercises.map((e, ei) => <View key={e.id} style={card}><Text style={white}>{e.name}</Text><Text style={muted}>{e.targetSets} × {e.repRange[0]}–{e.repRange[1]}</Text>{e.sets.map((s, si) => <View key={si} style={{ flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" }}><Text style={muted}>SET {si + 1}</Text><Pressable onPress={() => change(ei, si, "weight", -2.5)}><Text style={green}>−</Text></Pressable><Text style={white}>{s.weight} kg</Text><Pressable onPress={() => change(ei, si, "weight", 2.5)}><Text style={green}>+</Text></Pressable><Pressable onPress={() => change(ei, si, "reps", -1)}><Text style={green}>−</Text></Pressable><Text style={white}>{s.reps} reps</Text><Pressable onPress={() => change(ei, si, "reps", 1)}><Text style={green}>+</Text></Pressable><Pressable onPress={() => change(ei, si, "completed")}><Text style={{ color: s.completed ? "#9DE5A8" : "#8D969D", fontSize: 20 }}>{s.completed ? "✓" : "○"}</Text></Pressable></View>)}</View>)}<Pressable style={saveButton} onPress={save}><Text style={{ color: "#0B0E12", fontWeight: "900" }}>Save completed workout</Text></Pressable></>)}
    {tab === "Progress" && <><Text style={green}>PERFORMANCE</Text><Title text="Your progress" />{sessions.length ? sessions.map((x, i) => <View key={i} style={card}><Text style={white}>{x.title}</Text><Text style={muted}>{new Date(x.date).toLocaleDateString()} · {x.volume.toLocaleString()} kg volume</Text></View>) : <View style={card}><Text style={white}>No sessions saved</Text><Text style={muted}>Complete and save a workout to build your history.</Text></View>}</>}
    {tab === "Plan" && <><Text style={green}>PROGRAM BUILDER</Text><Title text={`${split.length} training days`} /><Text style={muted}>Generated from your Upper/Lower strength and hypertrophy style. Existing working loads carry into recurring exercises.</Text><View style={{ flexDirection: "row", gap: 9, marginTop: 18 }}>{[2,3,4,5,6].map(days => <Pressable key={days} onPress={() => { setSplit(generateFromStyle(days, split)); setSelected(0); }} style={{ backgroundColor: split.length === days ? "#9DE5A8" : "#151A20", width: 44, height: 44, borderRadius: 9, alignItems: "center", justifyContent: "center" }}><Text style={{ color: split.length === days ? "#0B0E12" : "white", fontWeight: "900" }}>{days}</Text></Pressable>)}</View>{split.map((item,index) => <Pressable key={item.id} onPress={() => { setSelected(index); setTab("Today"); }} style={card}><Text style={white}>{item.title}</Text><Text style={muted}>{item.focus} · {item.exercises.length} exercises · Tap to train today</Text></Pressable>)}</>}
    {tab === "Profile" && <><Text style={green}>ATHLETE PROFILE</Text><Title text="Advanced physique training" /><View style={card}><Text style={white}>Advanced · 90-minute sessions</Text><Text style={muted}>Full commercial gym · balanced development</Text></View><Text style={[green,{marginTop:22}]}>TRAINING PHASE</Text>{(["Hypertrophy","Bulk","Maintenance","Deload"] as Phase[]).map(item => <Pressable key={item} onPress={() => setPhase(item)} style={[card,{borderWidth:phase === item ? 1 : 0,borderColor:"#9DE5A8"}]}><Text style={white}>{item}</Text><Text style={muted}>{phaseDescription(item)}</Text></Pressable>)}</>}
  </ScrollView><View style={{ position: "absolute", bottom: 82, left: 18, right: 18, flexDirection: "row", padding: 7, borderRadius: 18, backgroundColor: "#171E25", borderColor: "#2A3743", borderWidth: 1 }}>{(["Today", "Plan", "Progress", "Profile"] as Tab[]).map(x => <Pressable key={x} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: tab === x ? "#25372C" : "transparent" }} onPress={() => { setTab(x); setPicker(false); }}><Text style={{ color: tab === x ? "#A6F3B0" : "#87939D", fontWeight: "900",fontSize:11 }}>{x}</Text></Pressable>)}</View></SafeAreaView>;
}
function Title({ text }: { text: string }) { return <Text style={{ color: "#F4F7FA", fontSize: 32, fontWeight: "900", letterSpacing: -0.8, marginTop: 7 }}>{text}</Text>; }
const white = { color: "#F4F7FA", fontSize: 17, fontWeight: "800" } as const;
const muted = { color: "#93A0AC", marginTop: 6, lineHeight: 19 } as const;
const green = { color: "#A8F5B4", fontWeight: "900", letterSpacing: 0.5 } as const;
const outline = { borderWidth: 1, borderColor: "#314958", backgroundColor: "#0C1218", padding: 15, borderRadius: 14, marginTop: 20, alignItems: "center" as const };
const saveButton = { backgroundColor: "#A8F5B4", padding: 18, borderRadius: 14, alignItems: "center" as const, marginTop: 24 };
function phaseDescription(phase: Phase) { return { Hypertrophy: "Muscle-building volume, stable compounds, and accessory variation.", Bulk: "Higher-surplus mass phase with progressive overload and recovery focus.", Maintenance: "Moderate volume to preserve muscle and strength.", Deload: "Reduced volume and effort to restore recovery." }[phase]; }
