import { useCallback, useEffect, useState } from 'react';

export function useFormDraft<T>(key: string, initialValue: T) {
  const [draft, setDraft] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      // Ignora falhas de persistencia para nao quebrar o fluxo principal.
    }
  }, [key, draft]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // noop
    }
    setDraft(initialValue);
  }, [key, initialValue]);

  return { draft, setDraft, clearDraft };
}
