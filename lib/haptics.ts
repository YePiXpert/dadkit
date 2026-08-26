"use client";

export type HapticPattern = "tap" | "success";

// 短促单击用于普通勾选；成功纹用于装包完成等有里程碑感的动作。
const HAPTIC_PATTERNS: Record<HapticPattern, number[]> = {
  tap: [10],
  success: [14, 48, 20],
};

export function resolveHapticPattern(pattern: HapticPattern) {
  return [...HAPTIC_PATTERNS[pattern]];
}

export function triggerHaptic(pattern: HapticPattern = "tap") {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return false;
  }

  try {
    return navigator.vibrate(resolveHapticPattern(pattern));
  } catch {
    return false;
  }
}