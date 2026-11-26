import { useEffect, useRef, useState, type ReactNode } from "react";
import { Keyboard, StyleSheet, View, type LayoutRectangle } from "react-native";
import { workoutExerciseBlocks, type Exercise, type RoutineEdit } from "../domain/training";
import { RoutineExerciseRow } from "./RoutineExerciseRow";

export type RoutineScroll = {
  offset: () => number;
  scrollTo: (offset: number) => void;
  setEnabled: (enabled: boolean) => void;
  measure: (callback: (top: number, height: number) => void) => void;
};

type RoutineExerciseListProps = {
  exercises: Exercise[];
  openExerciseId: string | null;
  onReveal: (id: string | null) => void;
  onReplace: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (edit: RoutineEdit) => void;
  scroll: RoutineScroll;
  picker?: { exerciseId: string; content: ReactNode };
};

type Drag = {
  exerciseId: string;
  source: number;
  height: number;
  center: number;
  startY: number;
  pageY: number;
  startOffset: number;
  viewport?: { top: number; bottom: number };
  target: number;
};

const SCROLL_EDGE = 56;
const SCROLL_STEP = 12;

export function RoutineExerciseList({
  exercises, openExerciseId, onReveal, onReplace, onDelete, onEdit, scroll, picker,
}: RoutineExerciseListProps) {
  const blocks = workoutExerciseBlocks(exercises);
  const positions = new Map(exercises.map(({ id }, index) => [id, index + 1]));
  const layouts = useRef(new Map<string, LayoutRectangle>());
  const drag = useRef<Drag | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [preview, setPreview] = useState<{ source: number; target: number; height: number; delta: number } | null>(null);

  function resetDrag() {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    if (drag.current) scroll.setEnabled(true);
    drag.current = null;
  }

  useEffect(() => resetDrag, []);

  function updateDrag(pageY: number) {
    const current = drag.current;
    if (!current) return;
    current.pageY = pageY;
    const delta = pageY - current.startY + scroll.offset() - current.startOffset;
    const center = current.center + delta;
    let target = current.source;
    const direction = Math.sign(delta);
    for (let index = current.source + direction; direction && index >= 0 && index < blocks.length; index += direction) {
      const layout = layouts.current.get(blocks[index][0].id);
      if (!layout || (center - layout.y - layout.height / 2) * direction < 0) break;
      target = index;
    }
    current.target = target;
    setPreview((previous) => previous?.delta === delta && previous.target === target
      ? previous : { source: current.source, target, height: current.height, delta });
  }

  function startDrag(exerciseId: string, source: number, pageY: number) {
    if (drag.current || blocks.length < 2) return false;
    const blockId = blocks[source][0].id;
    const layout = layouts.current.get(blockId);
    if (!layout) return false;
    Keyboard.dismiss();
    onReveal(null);
    scroll.setEnabled(false);
    const current: Drag = {
      exerciseId, source, height: layout.height, center: layout.y + layout.height / 2,
      startY: pageY, pageY, startOffset: scroll.offset(), target: source,
    };
    drag.current = current;
    updateDrag(pageY);
    scroll.measure((top, height) => {
      if (drag.current === current) current.viewport = { top, bottom: top + height };
    });
    timer.current = setInterval(() => {
      const { viewport } = current;
      if (!viewport || current.pageY === current.startY) return;
      const offset = scroll.offset();
      const step = current.pageY < viewport.top + SCROLL_EDGE ? -SCROLL_STEP
        : current.pageY > viewport.bottom - SCROLL_EDGE ? SCROLL_STEP : 0;
      if (step) scroll.scrollTo(Math.max(0, offset + step));
      updateDrag(current.pageY);
    }, 24);
    return true;
  }

  function endDrag(commit: boolean) {
    const current = drag.current;
    resetDrag();
    setPreview(null);
    if (!commit || !current || current.target === current.source) return;
    const target = blocks[current.target]?.[0];
    if (target) onEdit({ type: "reorder", exerciseId: current.exerciseId, targetExerciseId: target.id });
  }

  return <View>
    {blocks.map((block, index) => {
      const blockId = block[0].id;
      const isDragging = preview?.source === index;
      let translateY = 0;
      if (preview) {
        if (isDragging) translateY = preview.delta;
        else if (index > preview.source && index <= preview.target) translateY = -preview.height;
        else if (index < preview.source && index >= preview.target) translateY = preview.height;
      }
      return <View
        key={blockId}
        onLayout={({ nativeEvent }) => layouts.current.set(blockId, nativeEvent.layout)}
        style={[styles.block, isDragging && styles.lifted, translateY !== 0 && { transform: [{ translateY }] }]}
      >
        {block.map(({ id, name }) => <View key={id}>
          <RoutineExerciseRow
            name={name}
            position={positions.get(id) ?? 1}
            isOpen={openExerciseId === id}
            canDelete={exercises.length > 1}
            canMoveUp={index > 0}
            canMoveDown={index < blocks.length - 1}
            onReveal={(open) => onReveal(open ? id : null)}
            onReplace={() => onReplace(id)}
            onDelete={() => onDelete(id)}
            onMove={(direction) => onEdit({ type: "move", exerciseId: id, direction })}
            onDragStart={(pageY) => startDrag(id, index, pageY)}
            onDragMove={updateDrag}
            onDragEnd={endDrag}
          />
          {picker?.exerciseId === id && picker.content}
        </View>)}
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  block: { backgroundColor: "#101311" },
  lifted: { zIndex: 2, opacity: 0.92, borderRadius: 6, shadowColor: "#000", shadowOpacity: 0.65, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
});
