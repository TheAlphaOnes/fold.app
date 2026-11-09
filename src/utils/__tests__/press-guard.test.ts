import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createKeyedGuard, createPressGuard } from '@/utils/press-guard';

describe('createPressGuard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('drops a double tap, then accepts the next one after the window', () => {
    const run = createPressGuard(400);
    const action = vi.fn();
    run(action);
    run(action);
    expect(action).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(400);
    run(action);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('holds while an async action is pending', async () => {
    const run = createPressGuard(400);
    let finish!: () => void;
    const action = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    run(action);
    vi.advanceTimersByTime(5000);
    run(action);
    expect(action).toHaveBeenCalledTimes(1);
    finish();
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(400);
    run(action);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('releases after a failed action', async () => {
    const run = createPressGuard(400);
    const p = run(() => Promise.reject(new Error('x')));
    await expect(p).rejects.toThrow('x');
    vi.advanceTimersByTime(400);
    const again = vi.fn();
    run(again);
    expect(again).toHaveBeenCalled();
  });
});

describe('createKeyedGuard', () => {
  it('drops the same action repeated within the window, passes different ones', () => {
    let t = 0;
    const once = createKeyedGuard(500, () => t);
    const a = vi.fn();
    const b = vi.fn();
    expect(once('push:/a', a)).toBe(true);
    expect(once('push:/a', a)).toBe(false);
    expect(once('back', b)).toBe(true);
    t = 600;
    expect(once('push:/a', a)).toBe(true);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
