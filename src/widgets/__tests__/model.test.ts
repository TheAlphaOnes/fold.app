import { describe, expect, it } from 'vitest';

import {
  buildOnThisDayTimeline,
  buildSheet,
  buildSheetTimeline,
  buildTodayTimeline,
  howLongAgo,
  mondayOf,
  sheetMonths,
  type WidgetMemory,
} from '@/widgets/model';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const mem = (id: number, createdAt: number, uri = `file:///w${id}.jpg`, words = ''): WidgetMemory => ({ id, createdAt, uri, words, place: '' });

describe('howLongAgo', () => {
  const now = new Date(2026, 10, 12, 15);
  it('names anniversaries in years', () => {
    expect(howLongAgo(at(2025, 11, 12), now)).toBe('1 year ago');
    expect(howLongAgo(at(2023, 11, 12), now)).toBe('3 years ago');
  });
  it('names other days by distance', () => {
    expect(howLongAgo(at(2026, 11, 12, 9), now)).toBe('today');
    expect(howLongAgo(at(2026, 11, 11), now)).toBe('yesterday');
    expect(howLongAgo(at(2026, 11, 2), now)).toBe('10 days ago');
    expect(howLongAgo(at(2026, 10, 12), now)).toBe('4 weeks ago');
    expect(howLongAgo(at(2026, 6, 1), now)).toBe('5 months ago');
    expect(howLongAgo(at(2025, 1, 3), now)).toBe('a year ago');
  });
});

describe('buildOnThisDayTimeline', () => {
  const now = new Date(2026, 10, 12, 9);

  it('waits quietly with nothing to show', () => {
    const [entry] = buildOnThisDayTimeline([], now);
    expect(entry.props.empty).toBe(true);
  });

  it("prefers this date's memories from earlier years, photos first", () => {
    const words = mem(1, at(2024, 11, 12), '', 'the long walk home');
    const photo = mem(2, at(2025, 11, 12));
    const other = mem(3, at(2026, 3, 1));
    const timeline = buildOnThisDayTimeline([other, words, photo], now, 3, 3);
    expect(timeline[0].props.id).toBe(2);
    expect(timeline[0].props.anniversary).toBe(true);
    expect(timeline[0].props.when).toBe('1 year ago');
    expect(timeline[1].props.id).toBe(1);
  });

  it('falls back to forgotten memories and never repeats back to back', () => {
    const a = mem(1, at(2026, 1, 5));
    const b = mem(2, at(2026, 4, 9));
    const fresh = mem(3, at(2026, 11, 10));
    const ids = buildOnThisDayTimeline([a, b, fresh], now, 3, 6).map((e) => e.props.id);
    expect(ids).not.toContain(3);
    ids.slice(1).forEach((id, i) => expect(id).not.toBe(ids[i]));
  });

  it('steps every few hours', () => {
    const timeline = buildOnThisDayTimeline([mem(1, at(2025, 1, 1))], now, 3, 4);
    expect(timeline.map((e) => e.date.getHours())).toEqual([9, 12, 15, 18]);
  });
});

describe('buildTodayTimeline', () => {
  it('changes with the day line and turns the page at midnight', () => {
    const now = new Date(2026, 10, 12, 9, 30);
    const timeline = buildTodayTimeline(now, { id: 7, uri: 'file:///t.jpg', words: '', count: 2 }, { current: 4, best: 6 });
    const hours = timeline.map((e) => `${e.date.getDate()}:${e.date.getHours()}`);
    expect(hours).toEqual(['12:9', '12:11', '12:16', '12:20', '13:0', '13:5', '13:11', '13:16', '13:20', '14:0']);
    expect(timeline[0].props).toMatchObject({ kept: true, id: 7, streak: 4, line: 'first light' });
    // Kept today: tomorrow starts unkept but the streak survives it, then breaks.
    expect(timeline[4].props).toMatchObject({ kept: false, id: 0, streak: 4 });
    expect(timeline[9].props.streak).toBe(0);
  });

  it('breaks an unextended streak at midnight', () => {
    const now = new Date(2026, 10, 12, 21);
    const timeline = buildTodayTimeline(now, null, { current: 3, best: 3 });
    expect(timeline[0].props).toMatchObject({ kept: false, streak: 3, line: 'before it ends' });
    expect(timeline[1].props.streak).toBe(0);
    expect(timeline[0].props.endsAt).toBe(new Date(2026, 10, 13).getTime());
  });
});

describe('buildSheet', () => {
  const today = new Date(2026, 10, 12); // a Thursday
  const covers = {
    '2026-11-09': { uri: 'file:///a.jpg', count: 1 },
    '2026-11-11': { uri: '', count: 2 },
    '2026-11-12': { uri: 'file:///b.jpg', count: 1 },
    '2026-11-01': { uri: 'file:///c.jpg', count: 1 },
  };

  it('lays the week out Monday to Sunday', () => {
    const sheet = buildSheet(today, covers);
    expect(sheet.week.map((d) => d.day)).toEqual([9, 10, 11, 12, 13, 14, 15]);
    expect(sheet.week.map((d) => d.letter).join('')).toBe('mtwtfss');
    expect(sheet.week[3]).toMatchObject({ isToday: true, uri: 'file:///b.jpg' });
    expect(sheet.week[4].isFuture).toBe(true);
    expect(sheet.keptWeek).toBe(3);
  });

  it('pads the month into whole weeks', () => {
    const sheet = buildSheet(today, covers);
    expect(sheet.calendar.length % 7).toBe(0);
    expect(sheet.calendar[0].key).toBe('2026-10-26');
    expect(sheet.calendar.filter((d) => d.inMonth)).toHaveLength(30);
    expect(sheet.keptMonth).toBe(4);
    expect(sheet.month).toBe('november');
  });

  it('moves today along at each midnight', () => {
    const timeline = buildSheetTimeline(new Date(2026, 10, 12, 18), covers);
    expect(timeline.map((e) => e.props.week.findIndex((d) => d.isToday))).toEqual([3, 4, 5]);
  });

  it('knows which months to fetch', () => {
    expect(mondayOf(new Date(2026, 10, 1)).getDate()).toBe(26);
    expect(sheetMonths(new Date(2026, 10, 30))).toEqual(['2026-11', '2026-12']);
  });
});
