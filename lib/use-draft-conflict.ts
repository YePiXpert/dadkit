"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type DraftConflictState<T extends Record<string, unknown>> = {
  acceptExternal(): void;
  conflictFields: Array<keyof T>;
  draft: T;
  hasConflict: boolean;
  keepLocal(): void;
  reset(next: T): void;
  setField<K extends keyof T>(key: K, value: T[K]): void;
};

export function useDraftConflict<T extends Record<string, unknown>>(
  external: T,
  active: boolean,
): DraftConflictState<T> {
  const externalKey = useMemo(() => JSON.stringify(external), [external]);
  const externalRef = useRef(clone(external));
  const baseRef = useRef(clone(external));
  const dirtyRef = useRef(new Set<keyof T>());
  const [draft, setDraft] = useState(() => clone(external));
  const [conflicts, setConflicts] = useState<Set<keyof T>>(new Set());
  const wasActive = useRef(false);

  const reset = useCallback((next: T) => {
    const copy = clone(next);
    externalRef.current = copy;
    baseRef.current = clone(copy);
    dirtyRef.current = new Set();
    setDraft(copy);
    setConflicts(new Set());
  }, []);

  useEffect(() => {
    const nextExternal = clone(external);
    externalRef.current = nextExternal;

    if (!active) {
      wasActive.current = false;
      return;
    }
    if (!wasActive.current) {
      wasActive.current = true;
      reset(nextExternal);
      return;
    }

    setDraft((currentDraft) => {
      const nextDraft = clone(currentDraft);
      const nextConflicts = new Set<keyof T>();
      const nextDirty = new Set(dirtyRef.current);

      for (const key of Object.keys(nextExternal) as Array<keyof T>) {
        const externalChanged = !same(nextExternal[key], baseRef.current[key]);
        if (!nextDirty.has(key)) {
          nextDraft[key] = cloneValue(nextExternal[key]);
        } else if (externalChanged && !same(nextExternal[key], currentDraft[key])) {
          nextConflicts.add(key);
        } else if (same(nextExternal[key], currentDraft[key])) {
          nextDirty.delete(key);
        }
      }

      baseRef.current = clone(nextExternal);
      dirtyRef.current = nextDirty;
      setConflicts(nextConflicts);
      return nextDraft;
    });
  // externalKey is the stable semantic dependency for the external snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, externalKey, reset]);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    dirtyRef.current.add(key);
    setConflicts((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const acceptExternal = useCallback(() => {
    const keys = new Set(conflicts);
    setDraft((current) => {
      const next = clone(current);
      for (const key of keys) {
        next[key] = cloneValue(externalRef.current[key]);
        dirtyRef.current.delete(key);
      }
      return next;
    });
    setConflicts(new Set());
  }, [conflicts]);

  const keepLocal = useCallback(() => setConflicts(new Set()), []);

  return {
    acceptExternal,
    conflictFields: [...conflicts],
    draft,
    hasConflict: conflicts.size > 0,
    keepLocal,
    reset,
    setField,
  };
}

function clone<T>(value: T): T {
  return cloneValue(value);
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
