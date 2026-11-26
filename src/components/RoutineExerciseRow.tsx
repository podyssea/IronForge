import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";

type RoutineExerciseRowProps = {
  name: string;
  position: number;
  isOpen: boolean;
  canDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onReveal: (open: boolean) => void;
  onReplace: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onDragStart: (pageY: number) => boolean;
  onDragMove: (pageY: number) => void;
  onDragEnd: (commit: boolean) => void;
};

type Touch = {
  x: number;
  y: number;
  mode: "pending" | "swipe" | "drag";
  claimed: boolean;
  wasOpen: boolean;
};

const ACTION_WIDTH = 172;
const HOLD_DELAY = 350;
const TOUCH_SLOP = 8;

export function RoutineExerciseRow({
  name, position, isOpen, canDelete, canMoveUp, canMoveDown, onReveal, onReplace, onDelete,
  onMove, onDragStart, onDragMove, onDragEnd,
}: RoutineExerciseRowProps) {
  const touch = useRef<Touch | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number | null>(null);

  function clearHold() {
    if (hold.current !== null) clearTimeout(hold.current);
    hold.current = null;
  }

  useEffect(() => clearHold, []);

  function startTouch(event: GestureResponderEvent) {
    if (touch.current) return;
    const { pageX, pageY } = event.nativeEvent;
    const current: Touch = { x: pageX, y: pageY, mode: "pending", claimed: false, wasOpen: isOpen };
    touch.current = current;
    if (canMoveUp || canMoveDown) {
      hold.current = setTimeout(() => {
        if (touch.current === current && onDragStart(current.y)) current.mode = "drag";
      }, HOLD_DELAY);
    }
  }

  function cancelHoldOnMovement(event: GestureResponderEvent) {
    const current = touch.current;
    if (current?.mode !== "pending") return;
    const { pageX, pageY } = event.nativeEvent;
    if (Math.max(Math.abs(pageX - current.x), Math.abs(pageY - current.y)) >= TOUCH_SLOP) clearHold();
  }

  function shouldClaim(event: GestureResponderEvent) {
    const current = touch.current;
    if (!current) return false;
    if (current.mode === "drag") return true;
    const dx = event.nativeEvent.pageX - current.x;
    const dy = event.nativeEvent.pageY - current.y;
    if (Math.abs(dx) < TOUCH_SLOP || Math.abs(dx) <= Math.abs(dy) * 1.35 || (dx > 0 && !current.wasOpen)) return false;
    clearHold();
    current.mode = "swipe";
    return true;
  }

  function move(event: GestureResponderEvent) {
    const current = touch.current;
    if (current?.mode === "drag") onDragMove(event.nativeEvent.pageY);
    if (current?.mode === "swipe") {
      const dx = event.nativeEvent.pageX - current.x;
      const offset = (current.wasOpen ? -ACTION_WIDTH : 0) + dx;
      setSwipeOffset(Math.max(-ACTION_WIDTH, Math.min(0, offset)));
    }
  }

  function end(commit: boolean, pageX?: number) {
    clearHold();
    const current = touch.current;
    touch.current = null;
    if (current?.mode === "drag") onDragEnd(commit);
    if (current?.mode === "swipe") {
      if (commit && pageX !== undefined) {
        const dx = pageX - current.x;
        onReveal(current.wasOpen ? dx < 36 : dx <= -36);
      }
      setSwipeOffset(null);
    }
  }

  const offset = swipeOffset ?? (isOpen ? -ACTION_WIDTH : 0);
  return <View style={styles.row}>
    {(isOpen || swipeOffset !== null) && <View
      style={styles.actions}
      pointerEvents={isOpen && swipeOffset === null ? "auto" : "none"}
      accessibilityElementsHidden={!isOpen}
      importantForAccessibility={isOpen ? "auto" : "no-hide-descendants"}
    >
      <Pressable accessibilityRole="button" accessibilityLabel={`Replace ${name}`} onPress={onReplace} style={styles.replace}>
        <Text style={styles.actionText}>Replace</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${name}`} accessibilityState={{ disabled: !canDelete }}
        disabled={!canDelete} onPress={onDelete} style={[styles.delete, !canDelete && styles.disabled]}>
        <Text style={styles.actionText}>Delete</Text>
      </Pressable>
    </View>}
    <View
      accessible
      accessibilityLabel={`${position}. ${name}`}
      accessibilityActions={[
        { name: "replace", label: "Replace exercise" },
        ...(canDelete ? [{ name: "delete", label: "Delete exercise" }] : []),
        ...(canMoveUp ? [{ name: "moveUp", label: "Move up" }] : []),
        ...(canMoveDown ? [{ name: "moveDown", label: "Move down" }] : []),
      ]}
      onAccessibilityAction={({ nativeEvent: { actionName } }) => {
        switch (actionName) {
          case "replace": onReplace(); break;
          case "delete": if (canDelete) onDelete(); break;
          case "moveUp": if (canMoveUp) onMove(-1); break;
          case "moveDown": if (canMoveDown) onMove(1); break;
        }
      }}
      onTouchStart={startTouch}
      onTouchMove={cancelHoldOnMovement}
      onTouchEnd={() => { if (!touch.current?.claimed) end(false); }}
      onTouchCancel={() => end(false)}
      onMoveShouldSetResponderCapture={shouldClaim}
      onResponderGrant={() => { if (touch.current) touch.current.claimed = true; }}
      onResponderMove={move}
      onResponderRelease={(event) => end(true, event.nativeEvent.pageX)}
      onResponderTerminate={() => end(false)}
      onResponderTerminationRequest={() => false}
      style={[styles.face, { transform: [{ translateX: offset }] }]}
    >
      <Text style={styles.position}>{position}</Text>
      <Text style={styles.name}>{name}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  row: { overflow: "hidden", borderTopColor: "#343c33", borderTopWidth: StyleSheet.hairlineWidth },
  face: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, padding: 8, backgroundColor: "#101311" },
  position: { color: "#aab3a7", fontSize: 13, fontWeight: "800", minWidth: 24, fontVariant: ["tabular-nums"] },
  name: { flex: 1, color: "#f2f4ef", fontSize: 16, fontWeight: "700" },
  actions: { position: "absolute", top: 0, right: 0, bottom: 0, width: ACTION_WIDTH, flexDirection: "row" },
  replace: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#344328" },
  delete: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#8d3029" },
  disabled: { backgroundColor: "#3d2421" },
  actionText: { color: "#f8faf5", fontSize: 14, fontWeight: "800" },
});
