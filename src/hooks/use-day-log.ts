import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCompositionsOnDate, getDatesWithMemories } from '@/db/journal-repository';
import { useJournalStore } from '@/hooks/use-journal';
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

  const hydrationVersion = useJournalStore((state) => state.hydrationVersion);
  const lastDeletedId = useJournalStore((state) => state.lastDeletedId);

  const days = useMemo(() => buildDaysThroughToday(origin, BEHIND), [origin]);

  useEffect(() => {
    setSelected(origin);
  }, [origin]);

  // Immediate optimistic filter when any memory is deleted
  useEffect(() => {
    if (lastDeletedId) {
      setEntries((prev) => prev.filter((item) => item.id !== lastDeletedId));
    }
  }, [lastDeletedId]);

  // Sync lit dates from database, updating whenever hydrationVersion bumps
  const refreshLitDates = useCallback(async () => {
    try {
      const dates = await getDatesWithMemories();
      setLitDates(new Set(dates));
    } catch (err) {
      console.error('Failed to load lit dates', err);
    }
  }, []);

  useEffect(() => {
    refreshLitDates();
  }, [refreshLitDates, hydrationVersion]);

  // Fetch compositions for selected date, re-fetching when date changes or hydrationVersion bumps
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
        console.error('Failed to get compositions on date', error);
        if (!cancelled) {
          setEntries([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selected, hydrationVersion]);

  const select = useCallback((date: Date) => {
    setSelected(clampToToday(date));
  }, []);

  const refresh = useCallback(async () => {
    await refreshLitDates();
    try {
      setLoading(true);
      const items = await getCompositionsOnDate(toDayKey(selected));
      setEntries(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [refreshLitDates, selected]);

  return { days, selected, select, entries, litDates, loading, refresh };
}
