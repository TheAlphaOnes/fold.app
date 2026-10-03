import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCompositionsOnDate, getDatesWithMemories } from '@/db/journal-repository';
import type { Composition } from '@/types/journal';
import { buildDaysThroughToday, clampToToday, toDayKey } from '@/utils/format-date';

const BEHIND = 90;

export function useDayLog(initialDate: Date) {
  const origin = useMemo(
    () => clampToToday(initialDate),
    [initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate()],
  );
  const [selected, setSelected] = useState(origin);
  const [entries, setEntries] = useState<Composition[]>([]);
  const [litDates, setLitDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const days = useMemo(() => buildDaysThroughToday(origin, BEHIND), [origin]);

  useEffect(() => {
    setSelected(origin);
  }, [origin]);

  useEffect(() => {
    let cancelled = false;
    getDatesWithMemories()
      .then((dates) => {
        if (!cancelled) setLitDates(new Set(dates));
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCompositionsOnDate(toDayKey(selected))
      .then((items) => {
        if (cancelled) return;
        setEntries(items);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setEntries([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const select = useCallback((date: Date) => {
    setSelected(clampToToday(date));
  }, []);

  return { days, selected, select, entries, litDates, loading };
}
