/**
 * BellePoule Modern - useDebounce
 * Diffère une valeur pour éviter les recalculs à chaque frappe
 * Licensed under GPL-3.0
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
