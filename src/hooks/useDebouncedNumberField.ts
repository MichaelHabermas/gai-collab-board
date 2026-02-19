import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_DEBOUNCE_MS = 350;

export interface IUseDebouncedNumberFieldOptions {
  min?: number;
  max?: number;
  debounceMs?: number;
}

function parseAndClamp(
  value: string,
  min: number | undefined,
  max: number | undefined
): number | null {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return null;
  }

  if (min != null && num < min) {
    return null;
  }

  if (max != null && num > max) {
    return null;
  }

  return num;
}

/**
 * Hook for a number input with local display state and debounced commit.
 * Use in property inspector spin boxes so rapid clicks don't stutter or trigger many writes.
 * - Local state updates immediately on change.
 * - onCommit is called after debounceMs of inactivity or on blur (flush).
 * - When propValue changes (e.g. selection or sync), local state syncs from prop.
 */
export function useDebouncedNumberField(
  propValue: string,
  onCommit: (value: number) => void,
  options: IUseDebouncedNumberFieldOptions = {}
): {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  onBlur: () => void;
} {
  const { min, max, debounceMs = DEFAULT_DEBOUNCE_MS } = options;
  const [localValue, setLocalValue] = useState<string>(propValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef<string>(propValue);

  // Sync local state and ref from prop when selection or external sync changes; clear pending debounce.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset local draft when prop (e.g. selection) changes
    setLocalValue(propValue);
    latestValueRef.current = propValue;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [propValue]);

  const commitValue = useCallback(
    (value: string) => {
      const parsed = parseAndClamp(value, min, max);
      if (parsed != null) {
        onCommit(parsed);
      }
    },
    [min, max, onCommit]
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    commitValue(latestValueRef.current);
  }, [commitValue]);

  const scheduleCommit = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      commitValue(latestValueRef.current);
    }, debounceMs);
  }, [commitValue, debounceMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const onChange = useCallback(
    (e: { target: { value: string } }) => {
      const next = e.target.value;
      latestValueRef.current = next;
      setLocalValue(next);
      scheduleCommit();
    },
    [scheduleCommit]
  );

  const onBlur = useCallback(() => {
    flush();
  }, [flush]);

  return {
    value: localValue,
    onChange,
    onBlur,
  };
}
