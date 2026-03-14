import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Basic localStorage mock for happy-dom if it's missing or incomplete
if (typeof window !== 'undefined') {
  if (!window.localStorage || typeof window.localStorage.getItem !== 'function') {
    const storage: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => storage[key] || null),
        setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
        removeItem: vi.fn((key: string) => { delete storage[key]; }),
        clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); }),
        length: 0,
        key: vi.fn((index: number) => Object.keys(storage)[index] || null),
      },
      writable: true,
    });
  }
}
