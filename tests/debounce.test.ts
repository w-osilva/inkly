import { describe, it, expect, vi } from 'vitest';
import { debounce } from '../src/core/debounce';

describe('debounce', () => {
  it('calls once after the delay with the latest args', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const d = debounce(spy, 400);
    d('a');
    d('b');
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(399);
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('b');
    vi.useRealTimers();
  });

  it('cancel() prevents a pending call', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const d = debounce(spy, 400);
    d('x');
    d.cancel();
    vi.advanceTimersByTime(1000);
    expect(spy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
